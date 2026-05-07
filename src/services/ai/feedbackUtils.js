export function buildFeedback({ scoreLine, mistakes, suggestions }) {
  return [
    "Overall evaluation:",
    scoreLine,
    "",
    "Mistakes:",
    ...mistakes.map((item) => `* ${item}`),
    "",
    "Suggestions:",
    ...suggestions.map((item) => `* ${item}`)
  ].join("\n");
}
