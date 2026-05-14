import { assertSupabaseConfig, supabase } from "../../lib/supabaseClient";

function mapClass(row) {
  const classRow = row?.classes || row;

  if (!classRow) {
    return null;
  }

  return {
    id: classRow.id,
    teacherId: classRow.teacher_id,
    teacher_id: classRow.teacher_id,
    title: classRow.title,
    description: classRow.description || "",
    inviteCode: classRow.invite_code,
    invite_code: classRow.invite_code,
    createdAt: classRow.created_at,
    created_at: classRow.created_at,
    joinedAt: row?.joined_at || null,
  };
}

export async function joinClassByCode(inviteCode) {
  assertSupabaseConfig();

  const normalizedCode = inviteCode.trim().toUpperCase();
  const { data, error } = await supabase.rpc("join_class_by_invite_code", {
    raw_invite_code: normalizedCode,
  });

  if (error) {
    throw error;
  }

  return mapClass(data);
}

export async function getMyClasses() {
  assertSupabaseConfig();

  const { data, error } = await supabase
    .from("class_students")
    .select("joined_at, classes(*)")
    .order("joined_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(mapClass).filter(Boolean);
}

export async function getDefaultStudentClassId() {
  const classes = await getMyClasses();
  return classes[0]?.id || null;
}
