export function buildFeedback({ scoreLine, mistakes, suggestions, labels = {} }) {
  const {
    overall = "Overall evaluation:",
    mistakesTitle = "Mistakes:",
    suggestionsTitle = "Suggestions:",
  } = labels;

  return [
    overall,
    scoreLine,
    "",
    mistakesTitle,
    ...mistakes.map((item) => `* ${item}`),
    "",
    suggestionsTitle,
    ...suggestions.map((item) => `* ${item}`)
  ].join("\n");
}
