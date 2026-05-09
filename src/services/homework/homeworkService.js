import { readStorage, seedStorage, writeStorage } from "../shared/storage";

const HOMEWORK_KEY = "english-platform-homework";
const HOMEWORK_SUBMISSIONS_KEY = "english-platform-homework-submissions";

const seededHomework = [
  {
    id: "homework-seed-1",
    title: "Present Perfect Reflection",
    instructions:
      "Write 120-150 words about a recent achievement using present perfect at least three times.",
    type: "writing_homework",
    level: "Intermediate",
    examType: "homework",
    deadline: "2026-05-20",
    attachmentName: "",
    attachmentUrl: "",
    correctAnswers: null,
    createdBy: "teacher-demo",
    createdByName: "Dilshod Rahimov",
    createdAt: "2026-05-05T09:00:00.000Z",
  },
  {
    id: "homework-seed-2",
    title: "Travel Vocabulary Matching",
    instructions:
      "Match the travel-related terms with the correct meanings and review the confusing pairs.",
    type: "vocabulary_homework",
    level: "Intermediate",
    examType: "homework",
    deadline: "2026-05-22",
    attachmentName: "",
    attachmentUrl: "",
    correctAnswers: {
      items: [
        {
          term: "Passport",
          correctAnswer: "Official travel identification document",
        },
        {
          term: "Boarding pass",
          correctAnswer: "Document used to enter the plane",
        },
      ],
    },
    createdBy: "teacher-demo",
    createdByName: "Dilshod Rahimov",
    createdAt: "2026-05-06T10:00:00.000Z",
  },
  {
    id: "homework-seed-3",
    title: "Speaking Voice Note",
    instructions:
      "Record a short voice note about a place where you study well and explain why it helps you.",
    type: "speaking_homework",
    level: "Intermediate",
    examType: "homework",
    deadline: "2026-05-24",
    attachmentName: "",
    attachmentUrl: "",
    correctAnswers: null,
    createdBy: "teacher-demo",
    createdByName: "Dilshod Rahimov",
    createdAt: "2026-05-07T08:30:00.000Z",
  },
];

const seededSubmissions = [
  {
    id: "homework-submission-seed-1",
    homeworkId: "homework-seed-1",
    title: "Present Perfect Reflection",
    homeworkType: "writing_homework",
    studentId: "student-demo",
    studentName: "Amina Karimova",
    status: "submitted",
    score: 74,
    total: 100,
    percentage: 74,
    band: 6.5,
    feedback:
      "Umumiy baho:\nWriting homework savolga mos va mazmunli. Asosiy fikrlar tushunarli, lekin ba'zi jumlalar yanada tabiiyroq bog'lansa yaxshi bo'ladi.\n\nXatolar:\n* Present perfect bilan past simple ayrim joylarda yaqin ishlatilgan.\n* Bitta fikr yetarli misol bilan ochilmagan.\n\nTavsiyalar:\n* Har bandda bitta aniq misol qo'shing.\n* Tense tanlovini tekshirib, signal words ishlating.\n\nKeyingi qadam:\nShu matndan ikkita gapni qayta yozib, tense farqini mustahkamlang.",
    criteria: {
      completion: 7,
      accuracy: 6.5,
      communication: 6.5,
      improvementReadiness: 7,
    },
    answer:
      "I have recently learned how to manage my study plan better, and it has improved my confidence a lot.",
    answers: null,
    wrongAnswers: [],
    transcript: "",
    fileName: "",
    fileUrl: "",
    submittedAt: "2026-05-08T09:45:00.000Z",
  },
];

function ensureSeeded() {
  seedStorage(HOMEWORK_KEY, seededHomework);
  seedStorage(HOMEWORK_SUBMISSIONS_KEY, seededSubmissions);
}

function normalizeSubmission(submission) {
  return {
    ...submission,
    total: submission.total ?? 100,
    percentage: submission.percentage ?? submission.percent ?? 0,
    percent: submission.percent ?? submission.percentage ?? 0,
    band: submission.band ?? null,
    criteria: submission.criteria || {},
    wrongAnswers: submission.wrongAnswers || [],
    answers: submission.answers || null,
    transcript: submission.transcript || "",
    fileName: submission.fileName || "",
    fileUrl: submission.fileUrl || "",
  };
}

export function getAllHomework() {
  ensureSeeded();

  return readStorage(HOMEWORK_KEY, []).sort(
    (left, right) => new Date(right.createdAt) - new Date(left.createdAt)
  );
}

export function getHomeworkById(id) {
  return getAllHomework().find((item) => item.id === id) || null;
}

export function createHomework(payload) {
  const current = getAllHomework();
  const nextHomework = {
    id: `homework-${Date.now()}`,
    title: payload.title,
    instructions: payload.instructions,
    type: payload.type,
    level: payload.level || "Intermediate",
    examType: payload.examType || "homework",
    deadline: payload.deadline || "",
    attachmentName: payload.attachmentName || "",
    attachmentUrl: payload.attachmentUrl || "",
    correctAnswers: payload.correctAnswers || null,
    createdBy: payload.createdBy,
    createdByName: payload.createdByName,
    createdAt: new Date().toISOString(),
  };

  writeStorage(HOMEWORK_KEY, [nextHomework, ...current]);
  return nextHomework;
}

export function getAllHomeworkSubmissions() {
  ensureSeeded();

  return readStorage(HOMEWORK_SUBMISSIONS_KEY, [])
    .map(normalizeSubmission)
    .sort((left, right) => new Date(right.submittedAt) - new Date(left.submittedAt));
}

export function getHomeworkSubmissionsByStudent(studentId) {
  return getAllHomeworkSubmissions().filter((item) => item.studentId === studentId);
}

export function getHomeworkSubmissionsByHomework(homeworkId) {
  return getAllHomeworkSubmissions().filter((item) => item.homeworkId === homeworkId);
}

export function getLatestHomeworkSubmission(homeworkId, studentId) {
  return (
    getAllHomeworkSubmissions().find(
      (item) => item.homeworkId === homeworkId && item.studentId === studentId
    ) || null
  );
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

export function saveHomeworkSubmission(payload) {
  const current = getAllHomeworkSubmissions();
  const nextSubmission = normalizeSubmission({
    id: `homework-submission-${Date.now()}`,
    ...payload,
    submittedAt: payload.submittedAt || new Date().toISOString(),
    status: payload.status || "submitted",
  });

  writeStorage(HOMEWORK_SUBMISSIONS_KEY, [nextSubmission, ...current]);
  return nextSubmission;
}
