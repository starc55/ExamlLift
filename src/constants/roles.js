export const ROLES = {
  STUDENT: "student",
  TEACHER: "teacher",
  ADMIN: "admin",
};

export const ROLE_LABELS = {
  [ROLES.STUDENT]: "Student",
  [ROLES.TEACHER]: "Teacher",
  [ROLES.ADMIN]: "Admin",
};

export function getDefaultRouteByRole(role) {
  switch (role) {
    case ROLES.TEACHER:
      return "/teacher/dashboard";
    case ROLES.ADMIN:
      return "/admin/dashboard";
    case ROLES.STUDENT:
    default:
      return "/student/dashboard";
  }
}
