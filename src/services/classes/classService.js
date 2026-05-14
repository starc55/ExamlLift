import { assertSupabaseConfig, supabase } from "../../lib/supabaseClient";

function generateInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const suffix = Array.from({ length: 5 }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");

  return `IELTS-${suffix}`;
}

function mapClass(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    teacherId: row.teacher_id,
    teacher_id: row.teacher_id,
    title: row.title,
    description: row.description || "",
    inviteCode: row.invite_code,
    invite_code: row.invite_code,
    createdAt: row.created_at,
    created_at: row.created_at,
    students: row.class_students || [],
    studentCount: row.class_students?.length || row.student_count || 0,
  };
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user?.id;
}

export async function createClass(payload) {
  assertSupabaseConfig();

  const teacherId = payload.teacherId || payload.teacher_id || (await getCurrentUserId());
  const record = {
    teacher_id: teacherId,
    title: payload.title.trim(),
    description: payload.description?.trim() || "",
    invite_code: payload.inviteCode || payload.invite_code || generateInviteCode(),
  };

  const { data, error } = await supabase
    .from("classes")
    .insert(record)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapClass(data);
}

export async function getTeacherClasses() {
  assertSupabaseConfig();

  const { data, error } = await supabase
    .from("classes")
    .select("*, class_students(id, student_id, joined_at, profiles:student_id(id, full_name, email))")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(mapClass);
}

export async function getClassById(classId) {
  assertSupabaseConfig();

  const { data, error } = await supabase
    .from("classes")
    .select("*, class_students(id, student_id, joined_at, profiles:student_id(id, full_name, email))")
    .eq("id", classId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return mapClass(data);
}

export async function updateClass(classId, updates) {
  assertSupabaseConfig();

  const record = {
    title: updates.title,
    description: updates.description,
  };

  const { data, error } = await supabase
    .from("classes")
    .update(record)
    .eq("id", classId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapClass(data);
}

export async function deleteClass(classId) {
  assertSupabaseConfig();

  const { error } = await supabase.from("classes").delete().eq("id", classId);

  if (error) {
    throw error;
  }
}

export { generateInviteCode };
