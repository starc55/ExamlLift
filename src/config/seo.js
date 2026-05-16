const DEFAULT_SITE_URL = "https://aesac.co";

export const SITE_NAME = "AESAC";
export const DEFAULT_DESCRIPTION =
  "AESAC is an English learning and assessment platform for teachers and students with homework, tests, content, AI feedback, and progress tracking.";
export const DEFAULT_OG_IMAGE = "/brand-logo-bg.png";
export const DEFAULT_FAVICON = "/brand-logo-bg.png";

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

export function getSiteUrl() {
  const configuredUrl = import.meta.env.VITE_SITE_URL;
  const runtimeUrl =
    typeof window !== "undefined" ? window.location.origin : DEFAULT_SITE_URL;

  return trimTrailingSlash(configuredUrl || runtimeUrl || DEFAULT_SITE_URL);
}

export function getCanonicalUrl(pathname = "/") {
  const normalizedPath =
    pathname === "/" ? "/" : `/${pathname.replace(/^\/+/, "")}`;
  return `${getSiteUrl()}${normalizedPath}`;
}

export const SEO_ROUTES = {
  "/": {
    title: "AESAC | English Learning and Assessment Platform",
    description: DEFAULT_DESCRIPTION,
    robots: "index,follow",
  },
  "/login": {
    title: "Login | AESAC",
    description:
      "Log in to AESAC to manage English lessons, homework, tests, AI feedback, and student progress.",
    robots: "index,follow",
  },
  "/register": {
    title: "Create Account | AESAC",
    description:
      "Create an AESAC account for teacher-led English learning, assessment, homework, and feedback workflows.",
    robots: "index,follow",
  },
  "/teacher/dashboard": {
    title: "Teacher Dashboard | AESAC",
    description:
      "Teacher workspace for classes, lessons, homework, tests, submissions, analytics, and student results.",
    robots: "noindex,nofollow",
  },
  "/teacher/classes": {
    title: "Teacher Classes | AESAC",
    description: "Manage invite-code classes and student groups in AESAC.",
    robots: "noindex,nofollow",
  },
  "/teacher/homework": {
    title: "Homework Management | AESAC",
    description:
      "Create and manage English homework tasks with AI-supported review.",
    robots: "noindex,nofollow",
  },
  "/teacher/homework/submissions": {
    title: "Homework Submissions | AESAC",
    description:
      "Review student homework submissions, files, scores, and AI feedback.",
    robots: "noindex,nofollow",
  },
  "/teacher/upload-content": {
    title: "Upload Content | AESAC",
    description:
      "Upload English learning content, PDFs, audio, and lesson materials.",
    robots: "noindex,nofollow",
  },
  "/teacher/manage-tests": {
    title: "Manage Tests | AESAC",
    description:
      "Build midterm, final, practice, and homework assessment tasks.",
    robots: "noindex,nofollow",
  },
  "/teacher/results": {
    title: "Student Results | AESAC",
    description:
      "Inspect student results, CEFR feedback, and test performance.",
    robots: "noindex,nofollow",
  },
  "/teacher/analytics": {
    title: "Teacher Analytics | AESAC",
    description: "Analyze class progress, submissions, and learning outcomes.",
    robots: "noindex,nofollow",
  },
  "/teacher/profile": {
    title: "Teacher Profile | AESAC",
    description: "View teacher account and platform profile details.",
    robots: "noindex,nofollow",
  },
  "/student/dashboard": {
    title: "Student Dashboard | AESAC",
    description:
      "Student workspace for lessons, homework, tests, and progress.",
    robots: "noindex,nofollow",
  },
  "/student/content": {
    title: "Learning Content | AESAC",
    description: "Open assigned lessons, PDFs, audio, and study content.",
    robots: "noindex,nofollow",
  },
  "/student/homework": {
    title: "Homework Center | AESAC",
    description: "Submit English homework and review saved feedback.",
    robots: "noindex,nofollow",
  },
  "/student/midterm": {
    title: "Midterm Control | AESAC",
    description:
      "Complete midterm vocabulary, grammar, and speaking assessment sections.",
    robots: "noindex,nofollow",
  },
  "/student/final": {
    title: "Final Control | AESAC",
    description:
      "Complete final reading, listening, writing, and speaking assessment sections.",
    robots: "noindex,nofollow",
  },
  "/student/results": {
    title: "Student Results | AESAC",
    description: "Review grouped test results, CEFR levels, and AI feedback.",
    robots: "noindex,nofollow",
  },
  "/student/profile": {
    title: "Student Profile | AESAC",
    description:
      "View student account, homework status, and assessment history.",
    robots: "noindex,nofollow",
  },
};

export function resolveSeoMeta(pathname = "/") {
  if (pathname.startsWith("/teacher/classes/")) {
    return {
      title: "Class Detail | AESAC",
      description: "Review class content, students, and teacher workflows.",
      robots: "noindex,nofollow",
    };
  }

  if (pathname.startsWith("/student/content/")) {
    return {
      title: "Content Detail | AESAC",
      description: "Open assigned learning content and related homework.",
      robots: "noindex,nofollow",
    };
  }

  if (pathname.startsWith("/student/homework/")) {
    return {
      title: "Homework Detail | AESAC",
      description: "Submit homework and review latest feedback.",
      robots: "noindex,nofollow",
    };
  }

  return (
    SEO_ROUTES[pathname] || {
      title: "Page Not Found | AESAC",
      description:
        "The AESAC page you are looking for could not be found. Return to the platform and continue learning.",
      robots: "noindex,follow",
    }
  );
}
