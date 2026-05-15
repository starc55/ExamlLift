import { assertSupabaseConfig, supabase } from "../../lib/supabaseClient";

const CONTENT_BUCKET = "content-files";
const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const PDF_MAX_BYTES = 10 * 1024 * 1024;
const AUDIO_MAX_BYTES = 20 * 1024 * 1024;
const IMAGE_MAX_DIMENSION = 1600;
const IMAGE_QUALITY = 0.82;
const DESCRIPTION_MAX_CHARS = 1000;
const TEXT_CONTENT_MAX_CHARS = 15000;
const LESSON_NOTES_MAX_CHARS = 12000;
const SECTION_BODY_MAX_CHARS = 2400;
const MAX_METADATA_SECTIONS = 5;
const ASSIGNMENT_TITLE_MAX_CHARS = 200;
const ASSIGNMENT_INSTRUCTIONS_MAX_CHARS = 2000;
const CONTENT_LIST_SELECT =
  "id,title,description,content_type,file_url,class_id,teacher_id,created_at";
const CONTENT_DETAILS_SELECT = `${CONTENT_LIST_SELECT},text_content,profiles:teacher_id(full_name)`;

const SUPPORTED_TYPES = {
  image: ["image/jpeg", "image/png", "image/webp"],
  pdf: ["application/pdf"],
  audio: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/webm", "audio/ogg"],
};

function parseContentMetadata(textContent) {
  if (!textContent) {
    return {};
  }

  try {
    return JSON.parse(textContent);
  } catch {
    return {
      sections: [
        {
          heading: "Lesson notes",
          body: textContent,
        },
      ],
    };
  }
}

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
  return String(value || "").trim().slice(0, maxChars);
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
  const sourceSections = Array.isArray(payload.sections) ? payload.sections : [];

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

function serializeContentMetadata(metadata) {
  const cleanedMetadata = removeEmptyFields(metadata);
  const serialized = JSON.stringify(cleanedMetadata);

  if (serialized.length <= TEXT_CONTENT_MAX_CHARS) {
    return serialized;
  }

  const compactMetadata = {
    ...cleanedMetadata,
    s: (cleanedMetadata.s || []).map((section) =>
      trimToLimit(section, 1800)
    ),
    ai: trimToLimit(cleanedMetadata.ai, 1200),
  };
  const compactSerialized = JSON.stringify(removeEmptyFields(compactMetadata));

  if (compactSerialized.length <= TEXT_CONTENT_MAX_CHARS) {
    return compactSerialized;
  }

  return JSON.stringify(
    removeEmptyFields({
      v: 2,
      c: compactMetadata.c,
      l: compactMetadata.l,
      d: compactMetadata.d,
      a: compactMetadata.a,
      s: (compactMetadata.s || []).map((section) =>
        trimToLimit(section, 1400)
      ),
      at: trimToLimit(compactMetadata.at, 160),
      ai: trimToLimit(compactMetadata.ai, 700),
    })
  );
}

function buildAssetMetadata(payload, primaryFileUrl) {
  const assets = {
    i: payload.imageUrl || payload.image_url || "",
    au: payload.audioUrl || payload.audio_url || "",
    p: payload.pdfUrl || payload.pdf_url || "",
    v: payload.videoUrl || payload.video_url || "",
  };

  return Object.entries(assets).reduce((cleaned, [key, value]) => {
    if (value && value !== primaryFileUrl) {
      cleaned[key] = value;
    }

    return cleaned;
  }, {});
}

function buildContentMetadata(payload, primaryFileUrl) {
  return removeEmptyFields({
    v: 2,
    c: payload.category || "General English",
    l: payload.level || "Intermediate",
    d: payload.duration || "10 min",
    a: buildAssetMetadata(payload, primaryFileUrl),
    s: normalizeMetadataSections(payload),
    at: trimToLimit(
      payload.assignmentTitle || `${payload.title} follow-up task`,
      ASSIGNMENT_TITLE_MAX_CHARS
    ),
    ai: trimToLimit(
      payload.assignmentInstructions ||
        "Upload your completed task or reflection for teacher review.",
      ASSIGNMENT_INSTRUCTIONS_MAX_CHARS
    ),
  });
}

function getMetadataValue(metadata, compactKey, legacyKey, fallback = "") {
  return metadata[compactKey] || metadata[legacyKey] || fallback;
}

function getMetadataAssets(metadata) {
  const assets = metadata.a || metadata.assets || {};

  return {
    imageUrl: metadata.imageUrl || assets.i || assets.imageUrl || "",
    audioUrl: metadata.audioUrl || assets.au || assets.audioUrl || "",
    pdfUrl: metadata.pdfUrl || assets.p || assets.pdfUrl || "",
    videoUrl: metadata.videoUrl || assets.v || assets.videoUrl || "",
  };
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

function getJsonSize(value) {
  try {
    return JSON.stringify(value).length;
  } catch {
    return 0;
  }
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

function getContentPayloadMetrics(payload, metadata, textContent) {
  return {
    payloadSize: getJsonSize(payload),
    textContentLength: textContent.length,
    sectionsCount: Array.isArray(metadata.s) ? metadata.s.length : 0,
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

function mapContentDetails(row) {
  if (!row) {
    return null;
  }

  const metadata = parseContentMetadata(row.text_content);
  const assets = getMetadataAssets(metadata);
  const sections = normalizeParsedSections(metadata, row.description);

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
    category:
      getMetadataValue(metadata, "c", "category") ||
      row.content_type ||
      "General English",
    level: getMetadataValue(metadata, "l", "level", "Intermediate"),
    duration: getMetadataValue(metadata, "d", "duration", "10 min"),
    imageUrl:
      assets.imageUrl || (row.content_type === "image" ? row.file_url : ""),
    audioUrl:
      assets.audioUrl || (row.content_type === "audio" ? row.file_url : ""),
    pdfUrl: assets.pdfUrl || (row.content_type === "pdf" ? row.file_url : ""),
    videoUrl:
      assets.videoUrl || (row.content_type === "video" ? row.file_url : ""),
    sections,
    assignmentTitle:
      getMetadataValue(metadata, "at", "assignmentTitle") ||
      `${row.title} follow-up task`,
    assignmentInstructions:
      getMetadataValue(metadata, "ai", "assignmentInstructions") ||
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

  const cleanedPayload = removeEmptyFields(payload);
  const teacherId =
    cleanedPayload.teacherId ||
    cleanedPayload.teacher_id ||
    (await getCurrentUserId());
  const contentType = inferContentType(cleanedPayload);
  const primaryFileUrl = getPrimaryFileUrl(cleanedPayload);
  const metadata = buildContentMetadata(cleanedPayload, primaryFileUrl);
  const textContent = serializeContentMetadata(metadata);
  const record = removeEmptyFields({
    teacher_id: teacherId,
    class_id: cleanedPayload.classId || cleanedPayload.class_id || null,
    title: cleanedPayload.title.trim(),
    description: trimToLimit(cleanedPayload.description, DESCRIPTION_MAX_CHARS),
    content_type: contentType,
    file_url: primaryFileUrl,
    text_content: textContent,
  });
  const metrics = getContentPayloadMetrics(
    cleanedPayload,
    metadata,
    textContent
  );

  console.log("content save payload metrics", metrics);
  logContentUploadStep("db insert payload metrics", metrics);

  const { data, error } = await supabase
    .from("contents")
    .insert(record)
    .select(CONTENT_LIST_SELECT)
    .single();

  if (error) {
    console.error("[content-upload] db insert error", {
      record: {
        ...record,
        text_content: undefined,
        text_content_length: record.text_content.length,
      },
      error,
    });
    throw error;
  }

  logContentUploadStep("db insert success", { id: data.id });
  return mapContentListItem(data);
}

export async function updateContent(id, payload) {
  assertSupabaseConfig();

  const cleanedPayload = removeEmptyFields(payload);
  const contentType = inferContentType(cleanedPayload);
  const primaryFileUrl = getPrimaryFileUrl(cleanedPayload);
  const metadata = buildContentMetadata(cleanedPayload, primaryFileUrl);
  const textContent = serializeContentMetadata(metadata);
  const record = removeEmptyFields({
    class_id: cleanedPayload.classId || cleanedPayload.class_id || null,
    title: cleanedPayload.title.trim(),
    description: trimToLimit(cleanedPayload.description, DESCRIPTION_MAX_CHARS),
    content_type: contentType,
    file_url: primaryFileUrl,
    text_content: textContent,
  });
  const metrics = getContentPayloadMetrics(
    cleanedPayload,
    metadata,
    textContent
  );

  console.log("content save payload metrics", { id, ...metrics });
  logContentUploadStep("db update payload metrics", { id, ...metrics });

  const { data, error } = await supabase
    .from("contents")
    .update(record)
    .eq("id", id)
    .select(CONTENT_LIST_SELECT)
    .single();

  if (error) {
    console.error("[content-upload] db update error", {
      id,
      record: {
        ...record,
        text_content: undefined,
        text_content_length: record.text_content.length,
      },
      error,
    });
    throw error;
  }

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

  const { data, error } = await supabase
    .from("contents")
    .select(CONTENT_DETAILS_SELECT)
    .eq("id", contentId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return mapContentDetails(data);
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
