import { ROLES } from "../../constants/roles";
import { readStorage, seedStorage, writeStorage } from "../shared/storage";

const USERS_KEY = "english-platform-users";
const SESSION_KEY = "english-platform-session";

const demoUsers = [
  {
    id: "student-demo",
    fullname: "Amina Karimova",
    email: "student@example.com",
    password: "student123",
    role: ROLES.STUDENT,
    targetBand: "6.5",
    createdAt: "2026-05-01T08:00:00.000Z",
  },
  {
    id: "teacher-demo",
    fullname: "Dilshod Rahimov",
    email: "teacher@example.com",
    password: "teacher123",
    role: ROLES.TEACHER,
    specialization: "IELTS mentor",
    createdAt: "2026-05-01T08:30:00.000Z",
  },
];

function ensureUsersSeeded() {
  seedStorage(USERS_KEY, demoUsers);
}

function readUsers() {
  ensureUsersSeeded();
  return readStorage(USERS_KEY, []);
}

function writeUsers(users) {
  writeStorage(USERS_KEY, users);
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const { password, ...safeUser } = user;
  return safeUser;
}

function persistSession(user) {
  writeStorage(SESSION_KEY, sanitizeUser(user));
}

export function getAllUsers() {
  return readUsers().map(sanitizeUser);
}

export function getUserById(userId) {
  return getAllUsers().find((user) => user.id === userId) || null;
}

export function registerUser(payload) {
  const users = readUsers();
  const normalizedEmail = payload.email.trim().toLowerCase();
  const exists = users.some((user) => user.email === normalizedEmail);

  if (exists) {
    throw new Error("A user with this email already exists.");
  }

  const user = {
    id: `user-${Date.now()}`,
    fullname: payload.fullname.trim(),
    email: normalizedEmail,
    password: payload.password,
    role: payload.role,
    targetBand: payload.role === ROLES.STUDENT ? payload.targetBand || "6.5" : null,
    specialization:
      payload.role === ROLES.TEACHER ? payload.specialization || "English teacher" : null,
    createdAt: new Date().toISOString(),
  };

  writeUsers([user, ...users]);
  persistSession(user);
  return sanitizeUser(user);
}

export function loginUser(email, password) {
  const users = readUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find(
    (item) => item.email === normalizedEmail && item.password === password
  );

  if (!user) {
    throw new Error("Incorrect email or password.");
  }

  persistSession(user);
  return sanitizeUser(user);
}

export function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
}

export function getActiveUser() {
  return readStorage(SESSION_KEY, null);
}
