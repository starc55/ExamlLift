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
    score: 24,
    maxScore: 30,
    percent: 80,
    feedback:
      "Overall evaluation:\nYour vocabulary performance is strong.\n\nMistakes:\n* A few synonym choices were confusing.\n\nSuggestions:\n* Practice using 10 new words in full sentences every day.",
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
    score: 38,
    maxScore: 50,
    percent: 76,
    feedback:
      "Overall evaluation:\nThe writing is logical, but some sentences feel repetitive.\n\nMistakes:\n* Several sentences use very similar structures.\n\nSuggestions:\n* Add one specific example in each paragraph.",
    submittedAt: "2026-05-03T11:20:00.000Z",
  },
];

function ensureResultsSeeded() {
  seedStorage(RESULTS_KEY, seededResults);
}

export function getAllResults() {
  ensureResultsSeeded();

  return readStorage(RESULTS_KEY, []).sort(
    (left, right) => new Date(right.submittedAt) - new Date(left.submittedAt)
  );
}

export function getStudentResults(studentId) {
  return getAllResults().filter((result) => result.studentId === studentId);
}

export function saveResult(payload) {
  const results = getAllResults();
  const nextResult = {
    id: `result-${Date.now()}`,
    ...payload,
    submittedAt: new Date().toISOString(),
  };

  writeStorage(RESULTS_KEY, [nextResult, ...results]);
  return nextResult;
}
