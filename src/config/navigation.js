import {
  FaBookOpen,
  FaChartColumn,
  FaChartLine,
  FaClipboardCheck,
  FaFileArrowUp,
  FaFileLines,
  FaGaugeHigh,
  FaGraduationCap,
  FaHouse,
  FaListCheck,
  FaUser,
} from "react-icons/fa6";
import { ROLES } from "../constants/roles";

export const navigationByRole = {
  [ROLES.STUDENT]: [
    { to: "/student/dashboard", label: "Dashboard", icon: FaHouse },
    { to: "/student/content", label: "Content", icon: FaBookOpen },
    { to: "/student/midterm", label: "Midterm Control", icon: FaClipboardCheck },
    { to: "/student/final", label: "Final Control", icon: FaGraduationCap },
    { to: "/student/results", label: "Results", icon: FaChartLine },
    { to: "/student/profile", label: "Profile", icon: FaUser },
  ],
  [ROLES.TEACHER]: [
    { to: "/teacher/dashboard", label: "Dashboard", icon: FaHouse },
    { to: "/teacher/upload-content", label: "Upload Content", icon: FaFileArrowUp },
    { to: "/teacher/manage-tests", label: "Manage Tests", icon: FaListCheck },
    { to: "/teacher/results", label: "Student Results", icon: FaChartColumn },
    { to: "/teacher/analytics", label: "Analytics", icon: FaGaugeHigh },
    { to: "/teacher/profile", label: "Profile", icon: FaUser },
  ],
};

const routeTitles = {
  "/student/dashboard": "Student Dashboard",
  "/student/content": "Learning Content",
  "/student/midterm": "Midterm Control",
  "/student/final": "Final Control",
  "/student/results": "Result Center",
  "/student/profile": "Student Profile",
  "/teacher/dashboard": "Teacher Dashboard",
  "/teacher/upload-content": "Upload Content",
  "/teacher/manage-tests": "Manage Tests",
  "/teacher/results": "Student Results",
  "/teacher/analytics": "Analytics",
  "/teacher/profile": "Teacher Profile",
  "/login": "Login",
  "/register": "Register",
};

export function resolvePageTitle(pathname) {
  if (pathname.startsWith("/student/content/")) {
    return "Content Detail";
  }

  return routeTitles[pathname] || "English Learning Platform";
}
