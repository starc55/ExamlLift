import { assertSupabaseConfig, supabase } from "../../lib/supabaseClient";
import { getAllHomeworkSubmissions } from "../homework/homeworkService";
import { readStorage, writeStorage } from "../shared/storage";
import { getDefaultStudentClassId } from "../classes/studentClassService";

const TEMP_RESULT_PREFIX = "english-platform-temp-result";

const EXAM_SECTION_ORDER = {
  midterm: ["vocabulary", "grammar", "speaking"],
  final: ["writing", "speaking", "listening", "reading"],
};

const EXAM_TITLES = {
  midterm: "Midterm Control Result",
  final: "Final Exam Result",
  homework: "Homework Result",
  practice: "Practice Result",
};

export function percentageToCEFR(percentage) {
  const safePercentage = Math.min(100, Math.max(0, Number(percentage) || 0));

  if (safePercentage <= 20) return "A1";
  if (safePercentage <= 40) return "A2";
  if (safePercentage <= 60) return "B1";
  if (safePercentage <= 75) return "B2";
  if (safePercentage <= 90) return "C1";
  return "C2";
}

function tempResultKey(examType, studentId) {
  return `${TEMP_RESULT_PREFIX}-${studentId || "anonymous"}-${examType}`;
}

function roundPercentage(score, total) {
  const safeTotal = Number(total) || 0;

  if (!safeTotal) {
    return 0;
  }

  return Math.round(((Number(score) || 0) / safeTotal) * 100);
}

function getSectionRanking(sections = {}) {
  const entries = Object.entries(sections);

  if (!entries.length) {
    return {
      strongest: "section",
      weakest: "section",
    };
  }

  const sorted = [...entries].sort(
    (left, right) =>
      (right[1].percentage || right[1].percent || 0) -
      (left[1].percentage || left[1].percent || 0)
  );

  return {
    strongest: sorted[0][0],
    weakest: sorted[sorted.length - 1][0],
  };
}

export function buildFallbackExamFeedback({
  examType,
  percentage,
  overallCEFR,
  sections,
  feedbackLanguage = "uz",
}) {
  const examTitle = examType === "midterm" ? "Midterm" : "Final exam";
  const { strongest, weakest } = getSectionRanking(sections);

  if (feedbackLanguage === "en") {
    return `Overall evaluation:\n${examTitle} is complete: the overall result is ${percentage}%, the strongest section is ${strongest}, and the weakest section is ${weakest}.\n\nCEFR level:\n${overallCEFR}\n\nStrengths:\n* You showed stable overall performance.\n\nMistakes:\n* The ${weakest} section needs more accuracy and confidence.\n\nRecommendations:\n* Review the weakest section through short daily drills.\n\nNext step:\nUse a 20-minute daily plan and start with ${weakest}.`;
  }

  if (feedbackLanguage === "ru") {
    return `Общая оценка:\n${examTitle} завершен: общий результат ${percentage}%, самый сильный раздел - ${strongest}, самый слабый раздел - ${weakest}.\n\nУровень CEFR:\n${overallCEFR}\n\nСильные стороны:\n* Вы показали стабильный общий результат.\n\nОшибки:\n* В разделе ${weakest} нужно больше точности и уверенности.\n\nРекомендации:\n* Повторяйте слабый раздел короткими ежедневными упражнениями.\n\nСледующий шаг:\nСоставьте план на 20 минут в день и начните с раздела ${weakest}.`;
  }

  return `Umumiy baho:\n${examTitle} yakunlandi: umumiy natija ${percentage}%, eng kuchli section - ${strongest}, eng zaif section - ${weakest}.\n\nCEFR daraja:\n${overallCEFR}\n\nKuchli tomonlar:\n* Umumiy natijangiz barqaror ko'rindi.\n\nXatolar:\n* ${weakest} bo'limida aniqlik va ishonchni oshirish kerak.\n\nTavsiyalar:\n* Zaif bo'limni qisqa kundalik mashqlar bilan takrorlang.\n\nKeyingi qadam:\nKuniga 20 daqiqalik reja tuzing va ${weakest} bo'limidan boshlang.`;
}

function normalizeSectionResult(section = {}) {
  const totalScore = Number(
    section.totalScore ?? section.total ?? section.maxScore ?? 0
  );
  const score = Number(section.score ?? 0);
  const percentage = Number(
    section.percentage ?? section.percent ?? roundPercentage(score, totalScore)
  );
  const cefrLevel =
    section.cefrLevel || section.cefr || percentageToCEFR(percentage);

  return {
    ...section,
    score,
    totalScore,
    total: totalScore,
    maxScore: totalScore,
    percentage,
    percent: percentage,
    cefrLevel,
    band: section.band ?? null,
    criteria: section.criteria || {},
    answers: section.answers || null,
    wrongAnswers: section.wrongAnswers || [],
    transcript: section.transcript || "",
    answer: section.answer || "",
    aiFeedback: section.aiFeedback || section.feedback || "",
    feedback: section.feedback || section.aiFeedback || "",
    submittedAt: section.submittedAt || new Date().toISOString(),
  };
}

function normalizeSections(sections = {}) {
  return Object.entries(sections).reduce((accumulator, [key, value]) => {
    if (value) {
      accumulator[key] = normalizeSectionResult({
        sectionKey: key,
        title: value.title || key,
        ...value,
      });
    }

    return accumulator;
  }, {});
}

function getSectionTotals(sections) {
  return Object.values(sections).reduce(
    (totals, section) => ({
      score: totals.score + (Number(section.score) || 0),
      total: totals.total + (Number(section.totalScore ?? section.total) || 0),
    }),
    { score: 0, total: 0 }
  );
}

function normalizeResult(result) {
  const examType = result.examType || result.section || "homework";
  const inferredSectionKey =
    result.type && !result.sections ? result.type : examType;
  const sections = normalizeSections(
    result.sections || {
      [inferredSectionKey]: {
        title: result.testTitle || result.title || inferredSectionKey,
        ...result,
      },
    }
  );
  const totals = getSectionTotals(sections);
  const overallScore = Number(
    result.overallScore ?? result.score ?? totals.score
  );
  const totalScore = Number(
    result.totalScore ?? result.total ?? result.maxScore ?? totals.total
  );
  const percentage = Number(
    result.percentage ??
      result.percent ??
      roundPercentage(overallScore, totalScore)
  );
  const overallCEFR =
    result.overallCEFR ||
    result.cefrLevel ||
    result.cefr ||
    percentageToCEFR(percentage);
  const title =
    result.title || result.testTitle || EXAM_TITLES[examType] || "Result";
  const aiFeedback = result.aiFeedback || result.feedback || "";

  return {
    ...result,
    title,
    testTitle: title,
    examType,
    section: examType,
    type: result.type || (examType === "homework" ? "homework" : "full_exam"),
    sections,
    overallScore,
    totalScore,
    score: overallScore,
    total: totalScore,
    maxScore: totalScore,
    percentage,
    percent: percentage,
    overallCEFR,
    cefrLevel: overallCEFR,
    feedbackLanguage: result.feedbackLanguage || "uz",
    aiFeedback,
    feedback: aiFeedback,
    band: result.band ?? null,
    criteria: result.criteria || {},
    answers: result.answers || null,
    wrongAnswers: result.wrongAnswers || [],
    submittedAt: result.submittedAt || new Date().toISOString(),
  };
}

function mapDbResult(row) {
  return normalizeResult({
    id: row.id,
    studentId: row.student_id,
    studentName: row.profiles?.full_name || "Student",
    classId: row.class_id,
    testId: row.test_id,
    examType: row.exam_type,
    title: row.title,
    sections: row.sections || {},
    overallScore: row.overall_score,
    totalScore: row.total_score,
    percentage: row.percentage,
    overallCEFR: row.overall_cefr,
    feedbackLanguage: row.feedback_language || "uz",
    aiFeedback: row.ai_feedback || "",
    submittedAt: row.created_at,
  });
}

function homeworkSubmissionToResult(submission) {
  const percentage = Number(submission.percentage ?? submission.percent ?? 0);
  const cefrLevel = submission.cefrLevel || percentageToCEFR(percentage);
  const sectionKey = submission.homeworkType || "homework";

  return normalizeResult({
    id: `homework-result-${submission.id}`,
    studentId: submission.studentId,
    studentName: submission.studentName,
    classId: submission.classId,
    examType: "homework",
    title: `${submission.title || EXAM_TITLES.homework} Result`,
    sections: {
      [sectionKey]: {
        ...submission,
        title: submission.title || EXAM_TITLES.homework,
        totalScore: submission.total || 100,
        cefrLevel,
        aiFeedback: submission.feedback,
      },
    },
    overallScore: submission.score,
    totalScore: submission.total || 100,
    percentage,
    overallCEFR: cefrLevel,
    feedbackLanguage: submission.feedbackLanguage || "uz",
    aiFeedback: submission.feedback,
    submittedAt: submission.submittedAt,
  });
}

export async function getAllResults(options = {}) {
  assertSupabaseConfig();

  const { data, error } = await supabase
    .from("results")
    .select("*, profiles:student_id(full_name, email)")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const examResults = (data || []).map(mapDbResult);
  const homeworkSubmissions =
    options.homeworkSubmissions || (await getAllHomeworkSubmissions());
  const homeworkResults = options.includeHomework === false
    ? []
    : homeworkSubmissions.map(homeworkSubmissionToResult);

  return [...examResults, ...homeworkResults].sort(
    (left, right) => new Date(right.submittedAt) - new Date(left.submittedAt)
  );
}

export async function getResultsByStudent(studentId) {
  const results = await getAllResults();
  return results.filter((result) => result.studentId === studentId);
}

export async function getResultsBySection(section) {
  const results = await getAllResults();
  return results.filter((result) => result.section === section);
}

export async function getStudentResults(studentId) {
  return getResultsByStudent(studentId);
}

export async function getTeacherClassResults(filters = {}) {
  const results = await getAllResults();

  return results.filter((result) => {
    if (filters.classId && result.classId !== filters.classId) return false;
    if (filters.studentId && result.studentId !== filters.studentId) return false;
    if (filters.examType && result.examType !== filters.examType) return false;
    if (filters.date) {
      return new Date(result.submittedAt).toISOString().slice(0, 10) === filters.date;
    }

    return true;
  });
}

export async function getResultById(resultId) {
  const results = await getAllResults();
  return results.find((result) => result.id === resultId) || null;
}

export async function saveExamResult(payload) {
  assertSupabaseConfig();

  const classId =
    payload.classId || payload.class_id || (await getDefaultStudentClassId());
  const record = {
    student_id: payload.studentId || payload.student_id,
    class_id: classId,
    test_id: payload.testId || payload.test_id || null,
    exam_type: payload.examType || payload.exam_type || "practice",
    title: payload.title || EXAM_TITLES[payload.examType] || "Result",
    sections: payload.sections || {},
    overall_score: payload.overallScore ?? payload.score ?? null,
    total_score: payload.totalScore ?? payload.total ?? null,
    percentage: payload.percentage ?? payload.percent ?? null,
    overall_cefr: payload.overallCEFR || payload.cefrLevel || null,
    feedback_language: payload.feedbackLanguage || "uz",
    ai_feedback: payload.aiFeedback || payload.feedback || "",
  };

  const { data, error } = await supabase
    .from("results")
    .insert(record)
    .select("*, profiles:student_id(full_name, email)")
    .single();

  if (error) {
    throw error;
  }

  return mapDbResult(data);
}

export async function saveResult(payload) {
  return saveExamResult(payload);
}

export function getTempExamResult(examType, studentId) {
  return readStorage(tempResultKey(examType, studentId), {
    examType,
    studentId,
    sections: {},
  });
}

export function saveTempExamSection(
  examType,
  studentId,
  sectionKey,
  sectionResult
) {
  const current = getTempExamResult(examType, studentId);
  const nextTempResult = {
    ...current,
    examType,
    studentId,
    sections: {
      ...(current.sections || {}),
      [sectionKey]: normalizeSectionResult({
        sectionKey,
        ...sectionResult,
      }),
    },
    updatedAt: new Date().toISOString(),
  };

  writeStorage(tempResultKey(examType, studentId), nextTempResult);
  return nextTempResult;
}

export function clearTempExamResult(examType, studentId) {
  writeStorage(tempResultKey(examType, studentId), {
    examType,
    studentId,
    sections: {},
  });
}

export function hasAllExamSections(examType, sections = {}) {
  const expectedSections = EXAM_SECTION_ORDER[examType] || [];

  return expectedSections.every((sectionKey) => Boolean(sections[sectionKey]));
}

export function createGroupedExamResult({
  studentId,
  studentName,
  classId,
  examType,
  title = EXAM_TITLES[examType],
  sections,
  feedbackLanguage = "uz",
  aiFeedback = "",
}) {
  const normalizedSections = normalizeSections(sections);
  const totals = getSectionTotals(normalizedSections);
  const percentage = roundPercentage(totals.score, totals.total);
  const overallCEFR = percentageToCEFR(percentage);

  return normalizeResult({
    studentId,
    studentName,
    classId,
    examType,
    title,
    sections: normalizedSections,
    overallScore: totals.score,
    totalScore: totals.total,
    percentage,
    overallCEFR,
    feedbackLanguage,
    aiFeedback,
  });
}

export async function saveGroupedExamResult(payload) {
  const result = createGroupedExamResult(payload);
  return saveExamResult(result);
}
