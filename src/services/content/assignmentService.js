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
    status: "pending",
    submittedAt: "2026-05-05T10:00:00.000Z",
    reviewedAt: "",
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
    status: "accepted",
    submittedAt: "2026-05-03T08:20:00.000Z",
    reviewedAt: "2026-05-04T09:15:00.000Z",
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
    status: "pending",
    submittedAt: new Date().toISOString(),
    reviewedAt: "",
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
