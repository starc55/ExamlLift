import { getAllHomeworkSubmissions } from "../homework/homeworkService";
import { readStorage, seedStorage, writeStorage } from "../shared/storage";

const RESULTS_KEY = "english-platform-results";
const TEMP_RESULT_PREFIX = "english-platform-temp-result";

const EXAM_SECTION_ORDER = {
  midterm: ["vocabulary", "grammar", "speaking"],
  final: ["writing", "speaking", "listening", "reading"],
};

const EXAM_TITLES = {
  midterm: "Midterm Control Result",
  final: "Final Exam Result",
  homework: "Homework Result",
};

const seededResults = [
  {
    id: "result-seed-midterm",
    studentId: "student-demo",
    studentName: "Amina Karimova",
    examType: "midterm",
    title: EXAM_TITLES.midterm,
    sections: {
      vocabulary: {
        title: "Vocabulary",
        score: 24,
        totalScore: 30,
        percentage: 80,
        cefrLevel: "C1",
        criteria: {
          rangeBreadth: 7.5,
          precisionAccuracy: 7,
          appropriacyContextualUse: 7,
          flexibilityParaphrasing: 7,
        },
        aiFeedback:
          "Umumiy baho:\nVocabulary matching natijangiz yaxshi. Asosiy ma'nolarni tushundingiz, lekin ayrim juftliklarda aniqlik pasaydi.\n\nCEFR daraja:\nC1\n\nKuchli tomonlar:\n* Ko'p terminlarni tez tanidingiz.\n\nXatolar:\n* O'xshash ma'noli variantlar chalkashdi.\n\nTavsiyalar:\n* Har yangi so'z uchun qisqa misol yozing.\n\nKeyingi qadam:\nXato bo'lgan so'zlarni kartochka bilan takrorlang.",
        wrongAnswers: [
          {
            term: "Airborne Insertion",
            studentAnswer: "H",
            correctAnswer: "J",
            correctDefinition:
              "A military maneuver where troops are inserted by aircraft into an area.",
          },
        ],
      },
      grammar: {
        title: "Grammar",
        score: 22,
        totalScore: 30,
        percentage: 73,
        cefrLevel: "B2",
        criteria: {
          rangeForm: 6.5,
          accuracy: 7,
          appropriacy: 7,
          complexStructures: 6.5,
        },
      },
      speaking: {
        title: "Speaking",
        score: 15,
        totalScore: 20,
        percentage: 75,
        cefrLevel: "B2",
        band: 7,
        criteria: {
          fluency: 7,
          grammaticalRangeAccuracy: 6.5,
          lexicalResource: 7,
          pronunciation: 7,
        },
      },
    },
    overallScore: 61,
    totalScore: 80,
    percentage: 76,
    overallCEFR: "C1",
    feedbackLanguage: "uz",
    aiFeedback:
      "Umumiy baho:\nMidterm natijangiz barqaror: vocabulary eng kuchli bo'lim, grammar va speaking esa B2 atrofida.\n\nCEFR daraja:\nC1\n\nKuchli tomonlar:\n* So'z ma'nolarini tez tanish va umumiy kommunikatsiya yaxshi.\n\nXatolar:\n* Murakkab grammar va extended speakingda aniqlik pasaygan.\n\nTavsiyalar:\n* Conditionals, passive voice va 60 soniyalik monolog mashqlarini ulang.\n\nKeyingi qadam:\nHar kuni 15 daqiqa grammar drill va bitta qisqa speaking recording qiling.",
    submittedAt: "2026-05-02T09:30:00.000Z",
  },
  {
    id: "result-seed-final",
    studentId: "student-demo",
    studentName: "Amina Karimova",
    examType: "final",
    title: EXAM_TITLES.final,
    sections: {
      writing: {
        title: "Writing",
        score: 38,
        totalScore: 50,
        percentage: 76,
        cefrLevel: "C1",
        band: 6.5,
        criteria: {
          taskAchievement: 6.5,
          coherenceCohesion: 6.5,
          lexicalResource: 6.5,
          grammaticalRangeAccuracy: 6,
        },
      },
      speaking: {
        title: "Speaking",
        score: 22,
        totalScore: 30,
        percentage: 73,
        cefrLevel: "B2",
        band: 6.5,
      },
      listening: {
        title: "Listening",
        score: 16,
        totalScore: 20,
        percentage: 80,
        cefrLevel: "C1",
      },
      reading: {
        title: "Reading",
        score: 15,
        totalScore: 20,
        percentage: 75,
        cefrLevel: "B2",
      },
    },
    overallScore: 91,
    totalScore: 120,
    percentage: 76,
    overallCEFR: "C1",
    feedbackLanguage: "uz",
    aiFeedback:
      "Umumiy baho:\nFinal exam natijangiz kuchli: listening va writing yaxshi, reading va speakingda mayda aniqlik ishlari qolgan.\n\nCEFR daraja:\nC1\n\nKuchli tomonlar:\n* Asosiy mazmunni tushunish va fikrni tartibli yozish yaxshi.\n\nXatolar:\n* Inference savollari va uzun speaking javoblarida aniqlik kamayadi.\n\nTavsiyalar:\n* Readingda dalil topish, speakingda 2 daqiqalik structured answer mashq qiling.\n\nKeyingi qadam:\nBir hafta davomida har kuni bitta reading inference va bitta speaking response bajaring.",
    submittedAt: "2026-05-03T11:20:00.000Z",
  },
];

function ensureResultsSeeded() {
  seedStorage(RESULTS_KEY, seededResults);
}

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

  if (feedbackLanguage === "ru") {
    return `Общая оценка:\n${examTitle} завершен: общий результат ${percentage}%, самый сильный раздел - ${strongest}, самый слабый раздел - ${weakest}.\n\nУровень CEFR:\n${overallCEFR}\n\nСильные стороны:\n* Вы показали стабильный общий результат.\n\nОшибки:\n* В разделе ${weakest} нужно больше точности и уверенности.\n\nРекомендации:\n* Повторяйте слабый раздел короткими ежедневными упражнениями.\n\nСледующий шаг:\nСоставьте план на 20 минут в день и начните с раздела ${weakest}.`;
  }

  if (feedbackLanguage === "en") {
    return `Overall evaluation:\n${examTitle} is complete: the overall result is ${percentage}%, the strongest section is ${strongest}, and the weakest section is ${weakest}.\n\nCEFR level:\n${overallCEFR}\n\nStrengths:\n* You showed a stable overall performance.\n\nMistakes:\n* The ${weakest} section needs more accuracy and confidence.\n\nRecommendations:\n* Review the weakest section through short daily drills.\n\nNext step:\nUse a 20-minute daily plan and start with ${weakest}.`;
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

function isLegacyExamSection(result) {
  const examType = result.examType || result.section;
  const expectedSections = EXAM_SECTION_ORDER[examType] || [];

  return !result.sections && expectedSections.includes(result.type);
}

function buildLegacyFeedback(examType, percentage, cefrLevel) {
  const title = examType === "midterm" ? "Midterm" : "Final exam";

  return `Umumiy baho:\n${title} section natijalari umumiy resultga birlashtirildi.\n\nCEFR daraja:\n${cefrLevel}\n\nKuchli tomonlar:\n* Eng yuqori foizli section umumiy darajani ko'tardi.\n\nXatolar:\n* Past sectionlarda aniqlik va tezlikni yaxshilash kerak.\n\nTavsiyalar:\n* Section breakdowndagi past ko'rsatkichlardan boshlang.\n\nKeyingi qadam:\n${percentage}% natijani oshirish uchun 20 daqiqalik targeted review qiling.`;
}

function compactLegacyExamSections(results) {
  const compacted = [];
  const groups = new Map();

  results.forEach((result) => {
    if (!isLegacyExamSection(result)) {
      compacted.push(result);
      return;
    }

    const submittedDay = result.submittedAt
      ? new Date(result.submittedAt).toISOString().slice(0, 10)
      : "unknown-date";
    const examType = result.examType || result.section;
    const key = `${result.studentId || "unknown"}-${examType}-${submittedDay}`;
    const group = groups.get(key) || {
      id: `legacy-${key}`,
      studentId: result.studentId,
      studentName: result.studentName,
      examType,
      title: EXAM_TITLES[examType],
      sections: {},
      submittedAt: result.submittedAt,
      feedbackLanguage: result.feedbackLanguage || "uz",
    };

    group.sections[result.type] = {
      ...result,
      title: result.testTitle || result.title || result.type,
      totalScore: result.total ?? result.maxScore ?? 0,
      cefrLevel:
        result.cefrLevel ||
        percentageToCEFR(result.percentage ?? result.percent),
      aiFeedback: result.feedback || result.aiFeedback || "",
    };

    if (new Date(result.submittedAt) > new Date(group.submittedAt)) {
      group.submittedAt = result.submittedAt;
    }

    groups.set(key, group);
  });

  groups.forEach((group) => {
    const normalizedSections = normalizeSections(group.sections);
    const totals = getSectionTotals(normalizedSections);
    const percentage = roundPercentage(totals.score, totals.total);
    const overallCEFR = percentageToCEFR(percentage);

    compacted.push({
      ...group,
      sections: normalizedSections,
      overallScore: totals.score,
      totalScore: totals.total,
      percentage,
      overallCEFR,
      aiFeedback: buildLegacyFeedback(group.examType, percentage, overallCEFR),
    });
  });

  return compacted;
}

function homeworkSubmissionToResult(submission) {
  const percentage = Number(submission.percentage ?? submission.percent ?? 0);
  const cefrLevel = submission.cefrLevel || percentageToCEFR(percentage);
  const sectionKey = submission.homeworkType || "homework";

  return normalizeResult({
    id: `homework-result-${submission.id}`,
    studentId: submission.studentId,
    studentName: submission.studentName,
    examType: "homework",
    title: `${submission.title || EXAM_TITLES.homework} Result`,
    sections: {
      [sectionKey]: {
        ...submission,
        title: submission.title || EXAM_TITLES.homework,
        totalScore: submission.total,
        cefrLevel,
        aiFeedback: submission.feedback,
      },
    },
    overallScore: submission.score,
    totalScore: submission.total,
    percentage,
    overallCEFR: cefrLevel,
    feedbackLanguage: submission.feedbackLanguage || "uz",
    aiFeedback: submission.feedback,
    submittedAt: submission.submittedAt,
  });
}

function getStoredExamResults() {
  ensureResultsSeeded();

  return compactLegacyExamSections(readStorage(RESULTS_KEY, []))
    .map(normalizeResult)
    .filter((result) => result.examType !== "homework");
}

export function getAllResults() {
  const examResults = getStoredExamResults();
  const homeworkResults = getAllHomeworkSubmissions().map(
    homeworkSubmissionToResult
  );

  return [...examResults, ...homeworkResults].sort(
    (left, right) => new Date(right.submittedAt) - new Date(left.submittedAt)
  );
}

export function getResultsByStudent(studentId) {
  return getAllResults().filter((result) => result.studentId === studentId);
}

export function getResultsBySection(section) {
  return getAllResults().filter((result) => result.section === section);
}

export function getStudentResults(studentId) {
  return getResultsByStudent(studentId);
}

export function saveResult(payload) {
  const results = getStoredExamResults();
  const nextResult = normalizeResult({
    id: `result-${Date.now()}`,
    ...payload,
    submittedAt: payload.submittedAt || new Date().toISOString(),
  });

  writeStorage(RESULTS_KEY, [nextResult, ...results]);
  return nextResult;
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

export function saveGroupedExamResult(payload) {
  const result = createGroupedExamResult(payload);

  return saveResult(result);
}
