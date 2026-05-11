export const FEEDBACK_LANGUAGE_KEY = "english-platform-feedback-language";

export const FEEDBACK_LANGUAGE_OPTIONS = [
  { value: "uz", label: "Uzbek" },
  { value: "ru", label: "Russian" },
  { value: "en", label: "English" },
];

const SUPPORTED_LANGUAGES = new Set(FEEDBACK_LANGUAGE_OPTIONS.map((item) => item.value));

export function normalizeFeedbackLanguage(language) {
  return SUPPORTED_LANGUAGES.has(language) ? language : "uz";
}

export function getSavedFeedbackLanguage() {
  try {
    return normalizeFeedbackLanguage(localStorage.getItem(FEEDBACK_LANGUAGE_KEY));
  } catch {
    return "uz";
  }
}

export function saveFeedbackLanguage(language) {
  const normalized = normalizeFeedbackLanguage(language);

  try {
    localStorage.setItem(FEEDBACK_LANGUAGE_KEY, normalized);
  } catch {
    // Ignore storage errors and keep the in-memory selection.
  }

  return normalized;
}
