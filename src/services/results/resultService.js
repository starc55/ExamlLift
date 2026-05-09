import { readStorage, seedStorage, writeStorage } from "../shared/storage";

const RESULTS_KEY = "english-platform-results";

const seededResults = [
  {
    id: "result-seed-1",
    studentId: "student-demo",
    studentName: "Amina Karimova",
    testId: "test-vocabulary-1",
    testTitle: "Vocabulary Booster",
    type: "vocabulary",
    section: "midterm",
    examType: "midterm",
    score: 24,
    total: 30,
    percentage: 80,
    band: 7.5,
    feedback:
      "Umumiy baho:\nVocabulary matching natijangiz yaxshi. Asosiy ma'nolarni ko'ra oldingiz, lekin ayrim so'z juftliklarida chalkashish bor.\n\nXatolar:\n* O'xshash ma'noli variantlar orasida aniqlik pasaydi.\n* Ba'zi terms bilan definition orasidagi signal so'zlar ushlanmagan.\n\nTavsiyalar:\n* Har bir yangi so'z uchun qisqa misol tuzing.\n* Adashgan juftliklarni alohida kartochkaga yozing.\n\nKeyingi qadam:\nBugun aynan xato bo'lgan 3 ta so'zni qayta takrorlang.",
    criteria: {
      meaningMatch: 7,
      wordRecall: 7,
      precision: 6.5,
      memoryStrategy: 6.5,
    },
    wrongAnswers: [
      {
        term: "Airborne Insertion",
        studentAnswer: "H",
        correctAnswer: "J",
        correctDefinition:
          "A military maneuver where troops are inserted by aircraft into an area.",
      },
    ],
    submittedAt: "2026-05-02T09:30:00.000Z",
  },
  {
    id: "result-seed-2",
    studentId: "student-demo",
    studentName: "Amina Karimova",
    testId: "test-writing-1",
    testTitle: "Writing Task",
    type: "writing",
    section: "final",
    examType: "final",
    score: 38,
    total: 50,
    percentage: 76,
    band: 6.5,
    feedback:
      "Umumiy baho:\nJavob mantiqan tushunarli va savolga mos. Biroq ayrim fikrlar chuqurroq rivojlantirilsa, band yanada ko'tariladi.\n\nXatolar:\n* Ba'zi gap strukturalari takrorlangan.\n* Misollar yetarli darajada aniq emas.\n\nTavsiyalar:\n* Har asosiy fikrni bitta konkret misol bilan mustahkamlang.\n* Linking words va sentence variety ustida ishlang.\n\nKeyingi qadam:\nShu mavzuda bitta yangi paragraph yozib, ikki xil sentence opening ishlating.",
    criteria: {
      taskResponse: 6.5,
      coherence: 6.5,
      grammar: 6,
      vocabulary: 6.5,
    },
    wrongAnswers: [],
    submittedAt: "2026-05-03T11:20:00.000Z",
  },
];

function ensureResultsSeeded() {
  seedStorage(RESULTS_KEY, seededResults);
}

function normalizeResult(result) {
  return {
    ...result,
    total: result.total ?? result.maxScore ?? 0,
    maxScore: result.maxScore ?? result.total ?? 0,
    percentage: result.percentage ?? result.percent ?? 0,
    percent: result.percent ?? result.percentage ?? 0,
    band: result.band ?? null,
    criteria: result.criteria || {},
    answers: result.answers || null,
    wrongAnswers: result.wrongAnswers || [],
  };
}

export function getAllResults() {
  ensureResultsSeeded();

  return readStorage(RESULTS_KEY, [])
    .map(normalizeResult)
    .sort((left, right) => new Date(right.submittedAt) - new Date(left.submittedAt));
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
  const results = getAllResults();
  const nextResult = normalizeResult({
    id: `result-${Date.now()}`,
    ...payload,
    submittedAt: payload.submittedAt || new Date().toISOString(),
  });

  writeStorage(RESULTS_KEY, [nextResult, ...results]);
  return nextResult;
}
