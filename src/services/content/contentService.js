import { assertSupabaseConfig, supabase } from "../../lib/supabaseClient";

const CONTENT_BUCKET = "content-files";
const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const PDF_MAX_BYTES = 10 * 1024 * 1024;
const AUDIO_MAX_BYTES = 20 * 1024 * 1024;
const IMAGE_MAX_DIMENSION = 1600;
const IMAGE_QUALITY = 0.82;

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

function inferContentType(payload) {
  if (payload.contentType) {
    return payload.contentType;
  }

  if (payload.pdfUrl) return "pdf";
  if (payload.audioUrl) return "audio";
  if (payload.imageUrl) return "image";
  return "text";
}

function buildContentMetadata(payload) {
  return {
    category: payload.category || "General English",
    level: payload.level || "Intermediate",
    duration: payload.duration || "10 min",
    imageUrl: payload.imageUrl || "",
    audioUrl: payload.audioUrl || "",
    pdfUrl: payload.pdfUrl || "",
    videoUrl: payload.videoUrl || "",
    sections: payload.sections?.length
      ? payload.sections
      : [
          {
            heading: "Lesson overview",
            body: payload.lessonNotes || payload.description || "",
          },
        ],
    assignmentTitle:
      payload.assignmentTitle || `${payload.title} follow-up task`,
    assignmentInstructions:
      payload.assignmentInstructions ||
      "Upload your completed task or reflection for teacher review.",
  };
}

function mapContent(row) {
  if (!row) {
    return null;
  }

  const metadata = parseContentMetadata(row.text_content);
  const sections = metadata.sections?.length
    ? metadata.sections
    : [
        {
          heading: "Lesson overview",
          body: row.description || "",
        },
      ];

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
    category: metadata.category || row.content_type || "General English",
    level: metadata.level || "Intermediate",
    duration: metadata.duration || "10 min",
    imageUrl:
      metadata.imageUrl || (row.content_type === "image" ? row.file_url : ""),
    audioUrl:
      metadata.audioUrl || (row.content_type === "audio" ? row.file_url : ""),
    pdfUrl: metadata.pdfUrl || (row.content_type === "pdf" ? row.file_url : ""),
    videoUrl:
      metadata.videoUrl || (row.content_type === "video" ? row.file_url : ""),
    sections,
    assignmentTitle: metadata.assignmentTitle || `${row.title} follow-up task`,
    assignmentInstructions:
      metadata.assignmentInstructions ||
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

export async function uploadContentFile(
  file,
  folder = "content",
  options = {}
) {
  assertSupabaseConfig();

  if (!file) {
    return "";
  }

  const userId = options.userId || (await getCurrentUserId());
  const path = `${folder}/${userId}/${Date.now()}-${safeFileName(file.name)}`;

  const { error } = await supabase.storage
    .from(CONTENT_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });

  if (error) {
    console.error("Supabase content upload failed:", {
      bucket: CONTENT_BUCKET,
      path,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      error,
    });
    throw error;
  }

  const { data } = supabase.storage.from(CONTENT_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadContentFiles(files = {}, options = {}) {
  assertSupabaseConfig();

  const onProgress = options.onProgress || (() => {});
  const userId = options.userId || (await getCurrentUserId());
  const uploadQueue = [
    { key: "image", folder: "content-images", file: files.image },
    { key: "audio", folder: "content-audio", file: files.audio },
    { key: "pdf", folder: "content-pdf", file: files.pdf },
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
        const publicUrl = await uploadContentFile(item.file, item.folder, {
          userId,
        });
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

  const teacherId =
    payload.teacherId || payload.teacher_id || (await getCurrentUserId());
  const metadata = buildContentMetadata(payload);
  const contentType = inferContentType(payload);
  const record = {
    teacher_id: teacherId,
    class_id: payload.classId || payload.class_id || null,
    title: payload.title.trim(),
    description: payload.description?.trim() || "",
    content_type: contentType,
    file_url:
      payload.fileUrl ||
      payload.file_url ||
      payload.pdfUrl ||
      payload.audioUrl ||
      payload.imageUrl ||
      "",
    text_content: JSON.stringify(metadata),
  };

  const { data, error } = await supabase
    .from("contents")
    .insert(record)
    .select("*, profiles:teacher_id(full_name)")
    .single();

  if (error) {
    console.error("Supabase content insert failed:", { record, error });
    throw error;
  }

  return mapContent(data);
}

export async function updateContent(id, payload) {
  assertSupabaseConfig();

  const metadata = buildContentMetadata(payload);
  const contentType = inferContentType(payload);
  const record = {
    class_id: payload.classId || payload.class_id || null,
    title: payload.title.trim(),
    description: payload.description?.trim() || "",
    content_type: contentType,
    file_url:
      payload.fileUrl ||
      payload.file_url ||
      payload.pdfUrl ||
      payload.audioUrl ||
      payload.imageUrl ||
      "",
    text_content: JSON.stringify(metadata),
  };

  const { data, error } = await supabase
    .from("contents")
    .update(record)
    .eq("id", id)
    .select("*, profiles:teacher_id(full_name)")
    .single();

  if (error) {
    console.error("Supabase content update failed:", { id, record, error });
    throw error;
  }

  return mapContent(data);
}

export async function getAllContent() {
  assertSupabaseConfig();

  const { data, error } = await supabase
    .from("contents")
    .select("*, profiles:teacher_id(full_name)")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(mapContent);
}

export async function getClassContents(classId) {
  assertSupabaseConfig();

  let query = supabase
    .from("contents")
    .select("*, profiles:teacher_id(full_name)")
    .order("created_at", { ascending: false });

  if (classId) {
    query = query.eq("class_id", classId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []).map(mapContent);
}

export async function getContentById(contentId) {
  assertSupabaseConfig();

  const { data, error } = await supabase
    .from("contents")
    .select("*, profiles:teacher_id(full_name)")
    .eq("id", contentId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return mapContent(data);
}

export async function deleteContent(id) {
  assertSupabaseConfig();

  const { error } = await supabase.from("contents").delete().eq("id", id);

  if (error) {
    throw error;
  }
}
