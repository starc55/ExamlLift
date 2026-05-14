import { assertSupabaseConfig, supabase } from "../../lib/supabaseClient";

const CONTENT_BUCKET = "content-files";

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
    imageUrl: metadata.imageUrl || (row.content_type === "image" ? row.file_url : ""),
    audioUrl: metadata.audioUrl || (row.content_type === "audio" ? row.file_url : ""),
    pdfUrl: metadata.pdfUrl || (row.content_type === "pdf" ? row.file_url : ""),
    videoUrl: metadata.videoUrl || (row.content_type === "video" ? row.file_url : ""),
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

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user?.id;
}

export async function uploadContentFile(file, folder = "content") {
  assertSupabaseConfig();

  if (!file) {
    return "";
  }

  const userId = await getCurrentUserId();
  const path = `${folder}/${userId}/${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage
    .from(CONTENT_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(CONTENT_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function createContent(payload) {
  assertSupabaseConfig();

  const teacherId = payload.teacherId || payload.teacher_id || (await getCurrentUserId());
  const metadata = {
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
    assignmentTitle: payload.assignmentTitle || `${payload.title} follow-up task`,
    assignmentInstructions:
      payload.assignmentInstructions ||
      "Upload your completed task or reflection for teacher review.",
  };
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
