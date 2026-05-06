const USERS_KEY = "ielts-platform-users";
const SESSION_KEY = "ielts-platform-session";

function readUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function registerUser(payload) {
  const users = readUsers();
  const exists = users.some((user) => user.email === payload.email);

  if (exists) {
    throw new Error("A user with this email already exists.");
  }

  const user = {
    id: String(Date.now()),
    name: payload.name,
    email: payload.email,
    password: payload.password,
    targetBand: payload.targetBand || "6.5"
  };

  users.push(user);
  writeUsers(users);
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));

  return user;
}

export function loginUser(email, password) {
  const users = readUsers();
  const user = users.find(
    (item) => item.email === email && item.password === password
  );

  if (!user) {
    throw new Error("Incorrect email or password.");
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
}

export function getActiveUser() {
  return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
}
