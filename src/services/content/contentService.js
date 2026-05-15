import { assertSupabaseConfig, supabase } from "../../lib/supabaseClient";

const CONTENT_BUCKET = "content-files";
const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const PDF_MAX_BYTES = 10 * 1024 * 1024;
const AUDIO_MAX_BYTES = 20 * 1024 * 1024;
const IMAGE_MAX_DIMENSION = 1600;
const IMAGE_QUALITY = 0.82;
const DESCRIPTION_MAX_CHARS = 1000;
const LESSON_NOTES_MAX_CHARS = 12000;
const SECTION_BODY_MAX_CHARS = 2400;
const MAX_METADATA_SECTIONS = 5;
const ASSIGNMENT_TITLE_MAX_CHARS = 200;
const ASSIGNMENT_INSTRUCTIONS_MAX_CHARS = 2000;
const CONTENT_LIST_SELECT =
  "id,title,description,content_type,file_url,class_id,teacher_id,created_at";
const CONTENT_DETAILS_SELECT = `${CONTENT_LIST_SELECT},profiles:teacher_id(full_name)`;
const CONTENT_DETAIL_ROW_SELECT =
  "body,sections,assignment_title,assignment_instructions";

const SUPPORTED_TYPES = {
  image: ["image/jpeg", "image/png", "image/webp"],
  pdf: ["application/pdf"],
  audio: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/webm", "audio/ogg"],
};

function isFileLike(value) {
  return (
    (typeof File !== "undefined" && value instanceof File) ||
    (typeof Blob !== "undefined" && value instanceof Blob)
  );
}

function isPlainObject(value) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isEmptyFieldValue(value) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0) ||
    (isPlainObject(value) && Object.keys(value).length === 0)
  );
}

export function removeEmptyFields(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => removeEmptyFields(item))
      .filter((item) => !isEmptyFieldValue(item));
  }

  if (isFileLike(value) || value instanceof Date || !isPlainObject(value)) {
    return typeof value === "string" ? value.trim() : value;
  }

  return Object.entries(value).reduce((cleaned, [key, item]) => {
    const nextValue = removeEmptyFields(item);

    if (!isEmptyFieldValue(nextValue)) {
      cleaned[key] = nextValue;
    }

    return cleaned;
  }, {});
}

function inferContentType(payload) {
  if (payload.contentType) {
    return normalizeContentType(payload.contentType);
  }

  if (payload.content_type) {
    return normalizeContentType(payload.content_type);
  }

  if (payload.pdfUrl || payload.pdf_url) return "pdf";
  if (payload.audioUrl || payload.audio_url) return "audio";
  if (payload.imageUrl || payload.image_url) return "image";
  if (payload.videoUrl || payload.video_url) return "video";
  return "text";
}

function normalizeContentType(contentType = "text") {
  const value = String(contentType).toLowerCase();

  if (value === "application/pdf" || value.includes("pdf")) return "pdf";
  if (value.startsWith("image/") || value === "image") return "image";
  if (value.startsWith("audio/") || value === "audio") return "audio";
  if (value.startsWith("video/") || value === "video") return "video";
  if (value === "text" || value === "text/plain") return "text";

  return "text";
}

function trimToLimit(value, maxChars) {
  return String(value || "")
    .trim()
    .slice(0, maxChars);
}

function chunkText(text, maxChars) {
  const chunks = [];
  let cursor = 0;

  while (cursor < text.length && chunks.length < MAX_METADATA_SECTIONS) {
    const nextChunk = text.slice(cursor, cursor + maxChars).trim();

    if (nextChunk) {
      chunks.push(nextChunk);
    }

    cursor += maxChars;
  }

  return chunks;
}

function normalizeMetadataSections(payload) {
  const sourceSections = Array.isArray(payload.sections)
    ? payload.sections
    : [];

  if (sourceSections.length) {
    return sourceSections
      .flatMap((section) =>
        chunkText(
          String(section?.body || section || "").trim(),
          SECTION_BODY_MAX_CHARS
        )
      )
      .slice(0, MAX_METADATA_SECTIONS);
  }

  const sourceText = trimToLimit(
    payload.lessonNotes || payload.lesson_notes || payload.description || "",
    LESSON_NOTES_MAX_CHARS
  );

  if (!sourceText) {
    return [];
  }

  const sections = [];
  const blocks = sourceText
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  for (const block of blocks) {
    if (sections.length >= MAX_METADATA_SECTIONS) {
      break;
    }

    sections.push(...chunkText(block, SECTION_BODY_MAX_CHARS));
  }

  return sections.slice(0, MAX_METADATA_SECTIONS);
}

function buildContentDetailRecord(payload, contentId) {
  const body = trimToLimit(
    payload.body || payload.lessonNotes || payload.lesson_notes || "",
    LESSON_NOTES_MAX_CHARS
  );

  return {
    content_id: contentId,
    body,
    sections: normalizeDetailSections(payload.sections),
    assignment_title: trimToLimit(
      payload.assignmentTitle ||
        payload.assignment_title ||
        `${payload.title} follow-up task`,
      ASSIGNMENT_TITLE_MAX_CHARS
    ),
    assignment_instructions: trimToLimit(
      payload.assignmentInstructions ||
        payload.assignment_instructions ||
        "Upload your completed task or reflection for teacher review.",
      ASSIGNMENT_INSTRUCTIONS_MAX_CHARS
    ),
  };
}

function normalizeDetailSections(sections) {
  if (!Array.isArray(sections)) {
    return [];
  }

  return sections
    .map((section, index) => {
      if (typeof section === "string") {
        const body = trimToLimit(section, SECTION_BODY_MAX_CHARS);
        return body ? { heading: `Lesson block ${index + 1}`, body } : null;
      }

      if (!isPlainObject(section)) {
        return null;
      }

      return removeEmptyFields({
        heading: trimToLimit(
          section.heading || `Lesson block ${index + 1}`,
          120
        ),
        body: trimToLimit(section.body || "", SECTION_BODY_MAX_CHARS),
      });
    })
    .filter(Boolean);
}

async function withSlowDetailsWarning(promise, details = {}) {
  const startedAt = Date.now();
  const warningTimer = setTimeout(() => {
    console.warn("INSERT_CONTENT_DETAILS exceeded 5000ms", {
      ...details,
      elapsedMs: Date.now() - startedAt,
    });
  }, 5000);

  try {
    return await promise;
  } finally {
    clearTimeout(warningTimer);
  }
}

function normalizeParsedSections(metadata, fallbackText) {
  const sourceSections = metadata.s || metadata.sections || [];

  if (!Array.isArray(sourceSections) || !sourceSections.length) {
    const body = trimToLimit(fallbackText || "", SECTION_BODY_MAX_CHARS);
    return body ? [{ heading: "Lesson overview", body }] : [];
  }

  return sourceSections
    .slice(0, MAX_METADATA_SECTIONS)
    .map((section, index) => {
      if (typeof section === "string") {
        return {
          heading: `Lesson block ${index + 1}`,
          body: trimToLimit(section, SECTION_BODY_MAX_CHARS),
        };
      }

      if (Array.isArray(section)) {
        return {
          heading: trimToLimit(section[0] || `Lesson block ${index + 1}`, 120),
          body: trimToLimit(section[1] || "", SECTION_BODY_MAX_CHARS),
        };
      }

      return {
        heading: trimToLimit(
          section.heading || `Lesson block ${index + 1}`,
          120
        ),
        body: trimToLimit(section.body || "", SECTION_BODY_MAX_CHARS),
      };
    })
    .filter((section) => section.heading || section.body);
}

function getApproxPayloadSize(value) {
  if (typeof value === "string") {
    return value.length;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).length;
  }

  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + getApproxPayloadSize(item), 0);
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce(
      (total, [key, item]) => total + key.length + getApproxPayloadSize(item),
      0
    );
  }

  return 0;
}

function getPrimaryFileUrl(payload) {
  return (
    payload.fileUrl ||
    payload.file_url ||
    payload.pdfUrl ||
    payload.pdf_url ||
    payload.audioUrl ||
    payload.audio_url ||
    payload.imageUrl ||
    payload.image_url ||
    payload.videoUrl ||
    payload.video_url ||
    ""
  );
}

function getContentPayloadMetrics(payload, detailsRecord) {
  return {
    payloadSize: getApproxPayloadSize(payload),
    bodyLength: String(detailsRecord.body || "").length,
    sectionsCount: Array.isArray(detailsRecord.sections)
      ? detailsRecord.sections.length
      : 0,
    lessonNotesLength: String(payload.lessonNotes || payload.lesson_notes || "")
      .length,
  };
}

function mapContentListItem(row) {
  if (!row) {
    return null;
  }

  const contentType = row.content_type || "text";

  return {
    id: row.id,
    teacherId: row.teacher_id,
    teacher_id: row.teacher_id,
    classId: row.class_id,
    class_id: row.class_id,
    title: row.title,
    description: trimToLimit(row.description, 120),
    contentType,
    content_type: contentType,
    fileUrl: row.file_url || "",
    file_url: row.file_url || "",
    category: contentType,
    level: "Published",
    duration: row.created_at
      ? new Date(row.created_at).toLocaleDateString()
      : "Recent",
    imageUrl: contentType === "image" ? row.file_url || "" : "",
    audioUrl: contentType === "audio" ? row.file_url || "" : "",
    pdfUrl: contentType === "pdf" ? row.file_url || "" : "",
    videoUrl: contentType === "video" ? row.file_url || "" : "",
    sections: [],
    assignmentTitle: "",
    assignmentInstructions: "",
    createdAt: row.created_at,
    created_at: row.created_at,
    createdBy: row.teacher_id,
    createdByName: "Teacher",
    isContentListItem: true,
  };
}

function mapContentDetails(row, detailRow = null) {
  if (!row) {
    return null;
  }

  const body = detailRow?.body || "";
  const detailSections = Array.isArray(detailRow?.sections)
    ? detailRow.sections
    : [];
  const sections = detailSections.length
    ? normalizeParsedSections({ sections: detailSections }, body)
    : body
      ? normalizeParsedSections(
          { s: normalizeMetadataSections({ lessonNotes: body }) },
          body
        )
      : normalizeParsedSections({}, row.description);

  return {
    id: row.id,
    teacherId: row.teacher_id,
    teacher_id: row.teacher_id,
    classId: row.class_id,
    class_id: row.class_id,
    title: row.title,
    description: row.description || "",
    contentType: row.content_type,
    content_type: row.content_type,
    fileUrl: row.file_url || "",
    file_url: row.file_url || "",
    category: row.content_type || "text",
    level: "Published",
    duration: row.created_at
      ? new Date(row.created_at).toLocaleDateString()
      : "Recent",
    imageUrl:
      row.content_type === "image" ? row.file_url || "" : "",
    audioUrl:
      row.content_type === "audio" ? row.file_url || "" : "",
    pdfUrl: row.content_type === "pdf" ? row.file_url || "" : "",
    videoUrl:
      row.content_type === "video" ? row.file_url || "" : "",
    body,
    sections,
    assignmentTitle:
      detailRow?.assignment_title ||
      `${row.title} follow-up task`,
    assignmentInstructions:
      detailRow?.assignment_instructions ||
      "Review this content and complete the assigned homework.",
    createdAt: row.created_at,
    created_at: row.created_at,
    createdBy: row.teacher_id,
    createdByName: row.profiles?.full_name || "Teacher",
  };
}

function safeFileName(fileName) {
  return String(fileName || "file")
    .replace(/[^a-z0-9.\-_]+/gi, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function formatMb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getDebugFileInfo(file) {
  return {
    name: file?.name || "",
    type: file?.type || "",
    size: file?.size || 0,
    sizeMb: file ? formatMb(file.size) : "0.0MB",
  };
}

function logContentUploadStep(step, details = {}) {
  console.info(`[content-upload] ${step}`, details);
}

function isPdfFile(file) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

function validateRawContentFile(file, kind) {
  if (!file) {
    return;
  }

  if (kind === "image") {
    if (!SUPPORTED_TYPES.image.includes(file.type)) {
      throw new Error("Only JPG, PNG, or WebP images are supported.");
    }

    return;
  }

  if (kind === "pdf") {
    if (!isPdfFile(file)) {
      throw new Error("Only PDF files are supported for PDF upload.");
    }

    if (file.size > PDF_MAX_BYTES) {
      throw new Error(`PDF must be ${formatMb(PDF_MAX_BYTES)} or smaller.`);
    }

    return;
  }

  if (kind === "audio") {
    if (!SUPPORTED_TYPES.audio.includes(file.type)) {
      throw new Error("Only MP3, WAV, WebM, or OGG audio files are supported.");
    }

    if (file.size > AUDIO_MAX_BYTES) {
      throw new Error(`Audio must be ${formatMb(AUDIO_MAX_BYTES)} or smaller.`);
    }
  }
}

async function loadImage(file) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";
    image.src = imageUrl;

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("Image could not be loaded."));
    });

    return image;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

async function optimizeImageFile(file) {
  validateRawContentFile(file, "image");

  if (file.size <= IMAGE_MAX_BYTES) {
    return file;
  }

  const image = await loadImage(file);
  const scale = Math.min(
    1,
    IMAGE_MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight)
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", {
    alpha: true,
  });

  if (!context) {
    throw new Error("Image optimization is not available in this browser.");
  }

  context.drawImage(image, 0, 0, width, height);

  const optimizedBlob =
    (await canvasToBlob(canvas, "image/webp", IMAGE_QUALITY)) ||
    (await canvasToBlob(canvas, "image/jpeg", IMAGE_QUALITY));

  if (!optimizedBlob) {
    throw new Error("Image optimization failed.");
  }

  const optimizedFile = new File(
    [optimizedBlob],
    `${safeFileName(file.name).replace(/\.[^.]+$/, "")}.webp`,
    {
      type: optimizedBlob.type || "image/webp",
      lastModified: Date.now(),
    }
  );

  if (optimizedFile.size > IMAGE_MAX_BYTES) {
    throw new Error(
      `Image is still too large after optimization (${formatMb(
        optimizedFile.size
      )}). Please choose an image under ${formatMb(IMAGE_MAX_BYTES)}.`
    );
  }

  return optimizedFile;
}

export function validateContentFile(file, kind) {
  validateRawContentFile(file, kind);
}

export async function prepareContentFile(file, kind) {
  if (!file) {
    return null;
  }

  if (kind === "image") {
    return optimizeImageFile(file);
  }

  validateRawContentFile(file, kind);
  return file;
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error("Supabase user lookup failed:", error);
    throw error;
  }

  return data.user?.id;
}

export async function uploadContentFile(file, teacherId) {
  assertSupabaseConfig();

  if (!file) {
    return "";
  }

  const ownerId = teacherId || (await getCurrentUserId());
  const path = `${ownerId}/${Date.now()}-${safeFileName(file.name)}`;
  const storagePath = `${CONTENT_BUCKET}/${path}`;

  logContentUploadStep("selected file", getDebugFileInfo(file));
  logContentUploadStep("upload start", {
    storagePath,
    contentType: file.type || "application/octet-stream",
  });

  const { error } = await supabase.storage
    .from(CONTENT_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });

  if (error) {
    console.error("[content-upload] upload error", {
      bucket: CONTENT_BUCKET,
      path,
      storagePath,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      error,
    });
    throw error;
  }

  const { data } = supabase.storage.from(CONTENT_BUCKET).getPublicUrl(path);
  logContentUploadStep("upload success", { storagePath });
  logContentUploadStep("public URL", { publicUrl: data.publicUrl });

  return data.publicUrl;
}

export async function uploadContentFiles(files = {}, options = {}) {
  assertSupabaseConfig();

  const onProgress = options.onProgress || (() => {});
  const userId = options.userId || (await getCurrentUserId());
  const uploadQueue = [
    { key: "image", file: files.image },
    { key: "audio", file: files.audio },
    { key: "pdf", file: files.pdf },
  ].filter((item) => Boolean(item.file));

  if (!uploadQueue.length) {
    onProgress({
      percent: 35,
      message: "No files selected. Saving metadata...",
    });
    return {
      imageUrl: "",
      audioUrl: "",
      pdfUrl: "",
    };
  }

  onProgress({ percent: 10, message: "Validating files..." });
  logContentUploadStep("selected files", {
    files: uploadQueue.map((item) => ({
      kind: item.key,
      ...getDebugFileInfo(item.file),
    })),
  });
  uploadQueue.forEach((item) => validateRawContentFile(item.file, item.key));

  onProgress({ percent: 18, message: "Optimizing image if needed..." });
  const preparedQueue = [];

  for (const item of uploadQueue) {
    preparedQueue.push({
      ...item,
      file: await prepareContentFile(item.file, item.key),
    });
  }

  let completed = 0;
  onProgress({
    percent: 30,
    message: "Uploading files to Supabase Storage...",
  });

  let entries;

  try {
    entries = await Promise.all(
      preparedQueue.map(async (item) => {
        const publicUrl = await uploadContentFile(item.file, userId);
        completed += 1;
        onProgress({
          percent: 30 + Math.round((completed / preparedQueue.length) * 50),
          message: `${completed}/${preparedQueue.length} file upload complete.`,
        });

        return [item.key, publicUrl];
      })
    );
  } catch (error) {
    console.error("Content files upload flow failed:", error);
    throw error;
  }

  const urls = Object.fromEntries(entries);

  return {
    imageUrl: urls.image || "",
    audioUrl: urls.audio || "",
    pdfUrl: urls.pdf || "",
  };
}

export async function createContent(payload) {
  assertSupabaseConfig();

  const cleanedPayload = payload || {};
  const teacherId =
    cleanedPayload.teacherId ||
    cleanedPayload.teacher_id ||
    (await getCurrentUserId());
  const contentType = inferContentType(cleanedPayload);
  const primaryFileUrl = getPrimaryFileUrl(cleanedPayload);
  const record = {
    teacher_id: teacherId,
    class_id: cleanedPayload.classId || cleanedPayload.class_id || null,
    title: cleanedPayload.title.trim(),
    description: trimToLimit(cleanedPayload.description, DESCRIPTION_MAX_CHARS),
    content_type: contentType,
    file_url: primaryFileUrl || null,
  };
  const metrics = getContentPayloadMetrics(cleanedPayload, {
    body: cleanedPayload.lessonNotes || cleanedPayload.lesson_notes || "",
    sections: [],
  });

  console.log("content save payload metrics", metrics);
  logContentUploadStep("db insert payload metrics", metrics);

  console.log("contents insert payload", {
    keys: Object.keys(record),
    file_url: Boolean(record.file_url),
    descriptionLength: record.description?.length || 0,
  });
  console.time("INSERT_CONTENTS");
  let contentResponse;

  try {
    contentResponse = await supabase
      .from("contents")
      .insert(record)
      .select(CONTENT_LIST_SELECT)
      .single();
  } finally {
    console.timeEnd("INSERT_CONTENTS");
  }

  const { data, error: contentError } = contentResponse;

  if (contentError) {
    console.error("[content-upload] db insert error", {
      record,
      error: contentError,
    });
    throw contentError;
  }

  console.log("content metadata insert done", { id: data.id });
  const detailRecord = buildContentDetailRecord(cleanedPayload, data.id);
  const detailMetrics = getContentPayloadMetrics(cleanedPayload, detailRecord);
  console.log("content detail payload metrics", detailMetrics);
  console.log("content_details insert payload", {
    keys: Object.keys(detailRecord),
    content_id: detailRecord.content_id,
    bodyLength: detailRecord.body.length,
    sectionsCount: detailRecord.sections.length,
    assignmentTitleLength: detailRecord.assignment_title.length,
    assignmentInstructionsLength: detailRecord.assignment_instructions.length,
  });

  console.time("INSERT_CONTENT_DETAILS");
  let detailResponse;

  try {
    detailResponse = await withSlowDetailsWarning(
      supabase.from("content_details").insert(detailRecord),
      {
        contentId: data.id,
        bodyLength: detailRecord.body.length,
        sectionsCount: detailRecord.sections.length,
      }
    );
  } finally {
    console.timeEnd("INSERT_CONTENT_DETAILS");
  }

  const { error: detailError } = detailResponse;

  if (detailError) {
    console.error("[content-upload] detail insert error", {
      contentId: data.id,
      body_length: detailRecord.body?.length || 0,
      sections_count: detailRecord.sections?.length || 0,
      error: detailError,
    });
    throw detailError;
  }

  console.log("content details insert done", { id: data.id });
  logContentUploadStep("db insert success", { id: data.id });
  return mapContentListItem(data);
}

export async function updateContent(id, payload) {
  assertSupabaseConfig();

  const cleanedPayload = payload || {};
  const contentType = inferContentType(cleanedPayload);
  const primaryFileUrl = getPrimaryFileUrl(cleanedPayload);
  const record = {
    class_id: cleanedPayload.classId || cleanedPayload.class_id || null,
    title: cleanedPayload.title.trim(),
    description: trimToLimit(cleanedPayload.description, DESCRIPTION_MAX_CHARS),
    content_type: contentType,
    file_url: primaryFileUrl || null,
  };
  const detailRecord = buildContentDetailRecord(cleanedPayload, id);
  const metrics = getContentPayloadMetrics(cleanedPayload, detailRecord);

  console.log("content save payload metrics", { id, ...metrics });
  logContentUploadStep("db update payload metrics", { id, ...metrics });

  console.time("INSERT_CONTENTS");
  let contentResponse;

  try {
    contentResponse = await supabase
      .from("contents")
      .update(record)
      .eq("id", id)
      .select(CONTENT_LIST_SELECT)
      .single();
  } finally {
    console.timeEnd("INSERT_CONTENTS");
  }

  const { data, error: contentError } = contentResponse;

  if (contentError) {
    console.error("[content-upload] db update error", {
      id,
      record,
      error: contentError,
    });
    throw contentError;
  }

  console.log("content metadata update done", { id: data.id });
  console.time("INSERT_CONTENT_DETAILS");
  let detailResponse;

  try {
    detailResponse = await withSlowDetailsWarning(
      supabase.from("content_details").upsert(detailRecord, {
        onConflict: "content_id",
      }),
      {
        contentId: id,
        bodyLength: detailRecord.body.length,
        sectionsCount: detailRecord.sections.length,
      }
    );
  } finally {
    console.timeEnd("INSERT_CONTENT_DETAILS");
  }

  const { error: detailError } = detailResponse;

  if (detailError) {
    console.error("[content-upload] detail upsert error", {
      contentId: id,
      body_length: detailRecord.body?.length || 0,
      sections_count: detailRecord.sections?.length || 0,
      error: detailError,
    });
    throw detailError;
  }

  console.log("content details update done", { id: data.id });
  logContentUploadStep("db update success", { id: data.id });
  return mapContentListItem(data);
}

export async function getContentList(options = {}) {
  assertSupabaseConfig();

  let query = supabase
    .from("contents")
    .select(CONTENT_LIST_SELECT)
    .order("created_at", { ascending: false });

  if (options.classId) {
    query = query.eq("class_id", options.classId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []).map(mapContentListItem);
}

export async function getContentDetails(contentId) {
  assertSupabaseConfig();

  const [contentResponse, detailResponse] = await Promise.all([
    supabase
      .from("contents")
      .select(CONTENT_DETAILS_SELECT)
      .eq("id", contentId)
      .maybeSingle(),
    supabase
      .from("content_details")
      .select(CONTENT_DETAIL_ROW_SELECT)
      .eq("content_id", contentId)
      .maybeSingle(),
  ]);

  if (contentResponse.error) {
    throw contentResponse.error;
  }

  if (
    detailResponse.error &&
    detailResponse.error.code !== "PGRST116"
  ) {
    throw detailResponse.error;
  }

  return mapContentDetails(contentResponse.data, detailResponse.data);
}

export async function getAllContent() {
  return getContentList();
}

export async function getClassContents(classId) {
  return getContentList({ classId });
}

export async function getContentById(contentId) {
  return getContentDetails(contentId);
}

export async function deleteContent(id) {
  assertSupabaseConfig();

  const { error } = await supabase.from("contents").delete().eq("id", id);

  if (error) {
    throw error;
  }
}
