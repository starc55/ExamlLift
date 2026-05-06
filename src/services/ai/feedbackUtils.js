export function buildFeedback({ scoreLine, mistakes, suggestions }) {
  return [
    "Overall score:",
    scoreLine,
    "",
    "Mistakes:",
    ...mistakes.map((item) => `* ${item}`),
    "",
    "Suggestions:",
    ...suggestions.map((item) => `* ${item}`)
  ].join("\n");
}
