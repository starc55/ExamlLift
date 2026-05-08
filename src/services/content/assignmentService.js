import { readStorage, seedStorage, writeStorage } from "../shared/storage";

const ASSIGNMENTS_KEY = "english-platform-assignments";

const seededAssignments = [
  {
    id: "assignment-seed-1",
    contentId: "present-perfect",
    contentTitle: "Present Perfect",
    taskTitle: "Present perfect mini writing",
    studentId: "student-demo",
    studentName: "Amina Karimova",
    teacherId: "teacher-demo",
    teacherName: "Dilshod Rahimov",
    note:
      "I wrote five sentences about my recent achievements and used present perfect in each one.",
    fileName: "present-perfect-homework.txt",
    fileUrl: "",
    aiFeedback:
      "Umumiy baho:\nTopshiriq present perfect mavzusi bo'yicha yaxshi tayyorlangan. Yozma izoh va biriktirilgan ish teacher uchun yetarli kontekst beradi.\n\nXatolar:\n* Ba'zi fikrlar aniq misol bilan yanada kuchaytirilishi mumkin.\n* Teacher ko'rib chiqishi uchun asosiy grammar nuqtalarini alohida ajratish foydali bo'ladi.\n\nTavsiyalar:\n* Keyingi safar ishlatgan 2-3 ta asosiy grammar structure'ni note ichida ko'rsating.\n* Faylda qaysi mashq yoki bo'lim bajarilganini qisqa yozing.",
    status: "pending",
    submittedAt: "2026-05-05T10:00:00.000Z",
    reviewedAt: "",
    aiReviewedAt: "2026-05-05T10:00:00.000Z",
  },
  {
    id: "assignment-seed-2",
    contentId: "travel-vocabulary",
    contentTitle: "Vocabulary for Travel",
    taskTitle: "Travel vocabulary voice note",
    studentId: "student-demo",
    studentName: "Amina Karimova",
    teacherId: "teacher-demo",
    teacherName: "Dilshod Rahimov",
    note: "I prepared a short travel story and attached my outline.",
    fileName: "travel-vocabulary-outline.pdf",
    fileUrl: "",
    aiFeedback:
      "Umumiy baho:\nTopshiriq travel vocabulary bo'yicha mazmunli yuborilgan va outline teacher review uchun foydali asos yaratadi.\n\nXatolar:\n* Note ichida ishlatilgan asosiy vocabulary birliklari alohida ko'rsatilmagan.\n* Story context haqida ko'proq detail berish mumkin edi.\n\nTavsiyalar:\n* Keyingi yuborishda ishlatgan 5 ta yangi word yoki phrase'ni note ichida yozing.\n* Outline bilan birga qisqa self-check ham qo'shing.",
    status: "accepted",
    submittedAt: "2026-05-03T08:20:00.000Z",
    reviewedAt: "2026-05-04T09:15:00.000Z",
    aiReviewedAt: "2026-05-03T08:20:00.000Z",
  },
];

function ensureAssignmentsSeeded() {
  seedStorage(ASSIGNMENTS_KEY, seededAssignments);
}

export function getAllAssignments() {
  ensureAssignmentsSeeded();

  return readStorage(ASSIGNMENTS_KEY, []).sort(
    (left, right) => new Date(right.submittedAt) - new Date(left.submittedAt)
  );
}

export function getAssignmentsForStudent(studentId) {
  return getAllAssignments().filter((assignment) => assignment.studentId === studentId);
}

export function getAssignmentsForTeacher(teacherId) {
  return getAllAssignments().filter((assignment) => assignment.teacherId === teacherId);
}

export function getAssignmentsForContent(contentId) {
  return getAllAssignments().filter((assignment) => assignment.contentId === contentId);
}

export function submitAssignment(payload) {
  const assignments = getAllAssignments();
  const nextAssignment = {
    id: `assignment-${Date.now()}`,
    contentId: payload.contentId,
    contentTitle: payload.contentTitle,
    taskTitle: payload.taskTitle || "Lesson assignment",
    studentId: payload.studentId,
    studentName: payload.studentName,
    teacherId: payload.teacherId,
    teacherName: payload.teacherName,
    note: payload.note || "",
    fileName: payload.fileName || "",
    fileUrl: payload.fileUrl || "",
    aiFeedback: payload.aiFeedback || "",
    status: "pending",
    submittedAt: new Date().toISOString(),
    reviewedAt: "",
    aiReviewedAt: payload.aiFeedback ? new Date().toISOString() : "",
  };

  writeStorage(ASSIGNMENTS_KEY, [nextAssignment, ...assignments]);
  return nextAssignment;
}

export function updateAssignmentStatus(id, status) {
  const assignments = getAllAssignments().map((assignment) =>
    assignment.id === id
      ? {
          ...assignment,
          status,
          reviewedAt: status === "accepted" ? new Date().toISOString() : "",
        }
      : assignment
  );

  writeStorage(ASSIGNMENTS_KEY, assignments);
  return assignments.find((assignment) => assignment.id === id) || null;
}
