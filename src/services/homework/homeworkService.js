import { assertSupabaseConfig, supabase } from "../../lib/supabaseClient";
import { uploadContentFile } from "../content/contentService";

function toDbHomeworkType(type = "writing") {
  return String(type).replace(/_homework$/, "");
}

function toUiHomeworkType(type = "writing") {
  return type.endsWith("_homework") ? type : `${type}_homework`;
}

function mapHomework(row) {
  if (!row) {
    return null;
  }

  const data = row.data || {};
  const type = toUiHomeworkType(row.homework_type);

  return {
    id: row.id,
    teacherId: row.teacher_id,
    teacher_id: row.teacher_id,
    classId: row.class_id,
    class_id: row.class_id,
    title: row.title,
    instructions: row.instructions || "",
    type,
    homeworkType: type,
    level: data.level || "Intermediate",
    examType: "homework",
    deadline: row.deadline ? row.deadline.slice(0, 10) : "",
    attachmentName: data.attachmentName || "",
    attachmentUrl: data.attachmentUrl || "",
    correctAnswers: data.correctAnswers || null,
    createdBy: row.teacher_id,
    createdByName: row.profiles?.full_name || "Teacher",
    createdAt: row.created_at,
    created_at: row.created_at,
  };
}

function mapSubmission(row) {
  if (!row) {
    return null;
  }

  const homework = row.homeworks || {};
  const homeworkType = toUiHomeworkType(homework.homework_type || "homework");
  const percentage = Number(row.percentage || 0);

  return {
    id: row.id,
    homeworkId: row.homework_id,
    homework_id: row.homework_id,
    title: homework.title || "Homework",
    homeworkType,
    studentId: row.student_id,
    student_id: row.student_id,
    studentName: row.profiles?.full_name || "Student",
    teacherId: homework.teacher_id || null,
    teacher_id: homework.teacher_id || null,
    classId: homework.class_id || null,
    status: row.status || "submitted",
    score: Number(row.score || 0),
    total: 100,
    percentage,
    percent: percentage,
    cefrLevel: row.cefr_level || "",
    band: row.cefr_level || null,
    feedback: row.ai_feedback || "",
    aiFeedback: row.ai_feedback || "",
    criteria: {},
    answer: row.answer_text || "",
    answers: null,
    wrongAnswers: [],
    transcript: row.answer_text || "",
    fileName: "",
    fileUrl: row.file_url || "",
    audioUrl: row.audio_url || "",
    submittedAt: row.submitted_at,
    submitted_at: row.submitted_at,
  };
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user?.id;
}

export async function uploadHomeworkFile(file) {
  const userId = await getCurrentUserId();
  return uploadContentFile(file, userId);
}

export async function getAllHomework() {
  assertSupabaseConfig();

  const { data, error } = await supabase
    .from("homeworks")
    .select("*, profiles:teacher_id(full_name)")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(mapHomework);
}

export async function getTeacherHomeworks() {
  return getAllHomework();
}

export async function getStudentHomeworks(classId = null) {
  assertSupabaseConfig();

  let query = supabase
    .from("homeworks")
    .select("*, profiles:teacher_id(full_name)")
    .order("created_at", { ascending: false });

  if (classId) {
    query = query.eq("class_id", classId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []).map(mapHomework);
}

export async function getHomeworkById(id) {
  assertSupabaseConfig();

  const { data, error } = await supabase
    .from("homeworks")
    .select("*, profiles:teacher_id(full_name)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return mapHomework(data);
}

export async function createHomework(payload) {
  assertSupabaseConfig();

  const teacherId =
    payload.teacherId || payload.teacher_id || (await getCurrentUserId());
  const record = {
    teacher_id: teacherId,
    class_id: payload.classId || payload.class_id || null,
    title: payload.title.trim(),
    instructions: payload.instructions || "",
    homework_type: toDbHomeworkType(payload.type || payload.homeworkType),
    data: {
      level: payload.level || "Intermediate",
      attachmentName: payload.attachmentName || "",
      attachmentUrl: payload.attachmentUrl || "",
      correctAnswers: payload.correctAnswers || null,
    },
    deadline: payload.deadline || null,
  };

  const { data, error } = await supabase
    .from("homeworks")
    .insert(record)
    .select("*, profiles:teacher_id(full_name)")
    .single();

  if (error) {
    throw error;
  }

  return mapHomework(data);
}

export async function getAllHomeworkSubmissions() {
  assertSupabaseConfig();

  const { data, error } = await supabase
    .from("homework_submissions")
    .select(
      "*, profiles:student_id(full_name, email), homeworks(id, title, teacher_id, class_id, homework_type)"
    )
    .order("submitted_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(mapSubmission);
}

export async function getHomeworkSubmissions() {
  return getAllHomeworkSubmissions();
}

export async function getHomeworkSubmissionsByStudent(studentId) {
  const submissions = await getAllHomeworkSubmissions();
  return submissions.filter((item) => item.studentId === studentId);
}

export async function getHomeworkSubmissionsByHomework(homeworkId) {
  const submissions = await getAllHomeworkSubmissions();
  return submissions.filter((item) => item.homeworkId === homeworkId);
}

export async function getLatestHomeworkSubmission(homeworkId, studentId) {
  assertSupabaseConfig();

  const { data, error } = await supabase
    .from("homework_submissions")
    .select(
      "*, profiles:student_id(full_name, email), homeworks(id, title, teacher_id, class_id, homework_type)"
    )
    .eq("homework_id", homeworkId)
    .eq("student_id", studentId)
    .order("submitted_at", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return mapSubmission(data?.[0]);
}

export function scoreObjectiveHomework(correctAnswers, answers) {
  const items = correctAnswers?.items || [];
  const wrongAnswers = items.reduce((collection, item, index) => {
    const key = String(item.id || index);
    const studentAnswer = String(answers[key] || "").trim();
    const correctAnswer = String(item.correctAnswer || "").trim();

    if (
      studentAnswer &&
      studentAnswer.toLowerCase() === correctAnswer.toLowerCase()
    ) {
      return collection;
    }

    collection.push({
      id: item.id || key,
      question: item.prompt || item.term || `Item ${index + 1}`,
      term: item.term || "",
      studentAnswer,
      correctAnswer,
      correctDefinition: item.correctDefinition || "",
      grammarTopic: item.grammarTopic || "",
    });

    return collection;
  }, []);

  const total = items.length || 1;
  const score = total - wrongAnswers.length;
  const percentage = Math.round((score / total) * 100);

  return {
    score,
    total,
    percentage,
    wrongAnswers,
  };
}

export async function submitHomework(payload) {
  assertSupabaseConfig();

  const studentId =
    payload.studentId || payload.student_id || (await getCurrentUserId());
  const record = {
    homework_id: payload.homeworkId || payload.homework_id,
    student_id: studentId,
    answer_text:
      payload.answer || payload.answerText || payload.transcript || "",
    file_url: payload.fileUrl || payload.file_url || "",
    audio_url: payload.audioUrl || payload.audio_url || "",
    score: payload.score ?? null,
    percentage: payload.percentage ?? payload.percent ?? null,
    cefr_level: payload.cefrLevel || payload.band || null,
    ai_feedback: payload.feedback || payload.aiFeedback || "",
    status: payload.status || "submitted",
  };

  const { data, error } = await supabase
    .from("homework_submissions")
    .insert(record)
    .select(
      "*, profiles:student_id(full_name, email), homeworks(id, title, teacher_id, class_id, homework_type)"
    )
    .single();

  if (error) {
    throw error;
  }

  return {
    ...mapSubmission(data),
    criteria: payload.criteria || {},
    wrongAnswers: payload.wrongAnswers || [],
    answers: payload.answers || null,
    total: payload.total ?? 100,
    band: payload.band ?? payload.cefrLevel ?? null,
  };
}

export const saveHomeworkSubmission = submitHomework;
