import finalData from "../../data/tests/final.json";
import midtermData from "../../data/tests/midterm.json";
import { vocabularyMatchingData } from "../../data/tests/midtermVocabularyMatching";
import { contentAssets } from "../../assets/content/assetRegistry";
import { assertSupabaseConfig, supabase } from "../../lib/supabaseClient";

function inferGrammarTopic(prompt) {
  if (prompt.includes("If I had")) return "Conditionals";
  if (prompt.includes("has been")) return "Present perfect";
  if (prompt.includes("was given")) return "Passive voice";
  return "General grammar";
}

const vocabularyMatchingQuestions = vocabularyMatchingData.words.map((word) => ({
  id: `vocab-match-${word.id}`,
  prompt: word.term,
  options: vocabularyMatchingData.definitions.map((definition) => definition.key),
  correctAnswer: word.correct,
}));

function buildMidtermVocabularyTest(overrides = {}) {
  return {
    id: "test-vocabulary-1",
    type: "vocabulary",
    section: "midterm",
    title: vocabularyMatchingData.title,
    stepTitle: "Vocabulary",
    instructions: vocabularyMatchingData.instruction,
    durationMinutes: 12,
    score: 30,
    level: "Intermediate",
    examType: "midterm",
    questions: vocabularyMatchingQuestions,
    matchingData: vocabularyMatchingData,
    ...overrides,
    title: overrides.title || vocabularyMatchingData.title,
    stepTitle: "Vocabulary",
    instructions: overrides.instructions || vocabularyMatchingData.instruction,
    questions: overrides.questions || vocabularyMatchingQuestions,
    matchingData: vocabularyMatchingData,
  };
}

const fallbackTests = [
  buildMidtermVocabularyTest(),
  {
    id: "test-grammar-1",
    type: "grammar",
    section: "midterm",
    title: "Grammar Control",
    instructions: "Complete the grammar check using one correct option per item.",
    durationMinutes: 12,
    score: 30,
    level: "Intermediate",
    examType: "midterm",
    questions: midtermData.grammar.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: question.options,
      correctAnswer: question.answer,
      grammarTopic: inferGrammarTopic(question.prompt),
    })),
  },
  {
    id: "test-reading-1",
    type: "reading",
    section: "final",
    title: "Reading Sprint",
    instructions: "Read the short passage and choose the best answer.",
    durationMinutes: 15,
    score: 20,
    level: "Intermediate",
    examType: "final",
    passageTitle: finalData.reading.title,
    passage: finalData.reading.passage,
    passageSummary:
      "Short daily study and quick error review improve memory, confidence, and reduce repeated mistakes.",
    questions: finalData.reading.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: question.options,
      correctAnswer: question.answer,
    })),
  },
  {
    id: "test-listening-1",
    type: "listening",
    section: "final",
    title: "Listening Focus",
    instructions: "Listen to the audio once or twice and answer the questions.",
    durationMinutes: 14,
    score: 20,
    level: "Intermediate",
    examType: "final",
    audioUrl: contentAssets.audio[finalData.listening.audioKey],
    audioTitle: "Study Schedule Conversation",
    topic: "Improving English through regular lessons",
    questions: finalData.listening.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: question.options,
      correctAnswer: question.answer,
    })),
  },
  {
    id: "test-writing-1",
    type: "writing",
    section: "final",
    title: "Writing Task",
    instructions: "Write a structured response with an introduction, support, and conclusion.",
    durationMinutes: 25,
    score: 50,
    level: "Intermediate",
    examType: "final",
    prompt: finalData.writing.prompt,
    taskTitle: "Opinion Essay",
    questions: [],
  },
  {
    id: "test-speaking-1",
    type: "speaking",
    section: "midterm",
    title: "Speaking Task",
    instructions: "Record your answer clearly and speak in connected sentences.",
    durationMinutes: 6,
    score: 20,
    level: "Intermediate",
    examType: "midterm",
    prompt: midtermData.speaking.prompt,
    taskTitle: "Midterm Speaking Task",
    questions: [],
  },
  {
    id: "test-speaking-2",
    type: "speaking",
    section: "final",
    title: "Speaking Reflection",
    instructions: "Give a longer answer with details and a final opinion.",
    durationMinutes: 8,
    score: 30,
    level: "Intermediate",
    examType: "final",
    prompt: finalData.speaking.prompt,
    taskTitle: "Final Speaking Reflection",
    questions: [],
  },
];

function getFallbackTest(type, examType) {
  const test = fallbackTests.find(
    (item) => item.type === type && item.examType === examType
  );

  if (type === "vocabulary" && examType === "midterm") {
    return buildMidtermVocabularyTest(test || {});
  }

  return test || null;
}

function mapDbTest(row) {
  if (!row) {
    return null;
  }

  const data = row.data || {};
  const type = row.section || data.type || "mixed";
  const examType = row.exam_type || data.examType || "practice";

  return {
    id: row.id,
    teacherId: row.teacher_id,
    classId: row.class_id,
    title: row.title,
    type,
    section: examType,
    examType,
    instructions: row.instructions || "",
    durationMinutes: Number(data.durationMinutes || 10),
    score: Number(data.score || 10),
    level: data.level || "Intermediate",
    prompt: data.prompt || "",
    taskTitle: data.taskTitle || row.title,
    passageTitle: data.passageTitle || "",
    passage: data.passage || "",
    passageSummary: data.passageSummary || "",
    audioUrl: data.audioUrl || "",
    audioTitle: data.audioTitle || "",
    topic: data.topic || "",
    questions: data.questions || [],
    matchingData:
      type === "vocabulary" && examType === "midterm"
        ? vocabularyMatchingData
        : data.matchingData,
    createdAt: row.created_at,
  };
}

function toDbRecord(payload, teacherId) {
  const type = payload.type || payload.section || "mixed";
  const examType = payload.examType || payload.section || "practice";

  return {
    teacher_id: payload.teacherId || payload.teacher_id || teacherId,
    class_id: payload.classId || payload.class_id || null,
    title: payload.title.trim(),
    exam_type: examType,
    section: type,
    instructions: payload.instructions || "",
    data: {
      durationMinutes: Number(payload.durationMinutes) || 10,
      score: Number(payload.score) || 10,
      level: payload.level || "Intermediate",
      prompt: payload.prompt || "",
      taskTitle: payload.taskTitle || payload.title,
      passageTitle: payload.passageTitle || "",
      passage: payload.passage || "",
      passageSummary: payload.passageSummary || "",
      audioUrl: payload.audioUrl || "",
      audioTitle: payload.audioTitle || "",
      topic: payload.topic || "",
      questions: payload.questions || [],
      matchingData: payload.matchingData || null,
    },
  };
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user?.id;
}

export async function getAllTests() {
  assertSupabaseConfig();

  const { data, error } = await supabase
    .from("tests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(mapDbTest);
}

export async function getTeacherTests() {
  return getAllTests();
}

export async function getStudentTestsByClass(classId) {
  assertSupabaseConfig();

  let query = supabase
    .from("tests")
    .select("*")
    .order("created_at", { ascending: false });

  if (classId) {
    query = query.eq("class_id", classId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []).map(mapDbTest);
}

export async function getTestsBySection(section) {
  const tests = await getAllTests();
  return tests.filter((test) => test.section === section);
}

export async function getTestByType(type, examType, classId = null) {
  assertSupabaseConfig();

  let query = supabase
    .from("tests")
    .select("*")
    .eq("section", type)
    .eq("exam_type", examType)
    .order("created_at", { ascending: false })
    .limit(1);

  if (classId) {
    query = query.eq("class_id", classId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return mapDbTest(data?.[0]) || getFallbackTest(type, examType);
}

export async function createTest(payload) {
  assertSupabaseConfig();

  const teacherId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("tests")
    .insert(toDbRecord(payload, teacherId))
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapDbTest(data);
}

export async function updateTest(id, updates) {
  assertSupabaseConfig();

  const teacherId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("tests")
    .update(toDbRecord(updates, teacherId))
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapDbTest(data);
}

export async function deleteTest(id) {
  assertSupabaseConfig();

  const { error } = await supabase.from("tests").delete().eq("id", id);

  if (error) {
    throw error;
  }
}
