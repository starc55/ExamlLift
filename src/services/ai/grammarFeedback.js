import { buildFeedback } from "./feedbackUtils";

export function getGrammarFeedback({ percent }) {
  const scoreLine =
    percent >= 80
      ? "Grammar accuracy is on a good track."
      : "Grammar foundation needs reinforcement.";

  const mistakes =
    percent >= 80
      ? [
          "Minor tense selection errors appeared.",
          "Article usage can be more natural.",
        ]
      : [
          "Verb tense choices were inconsistent.",
          "Sentence structure needs more control.",
        ];

  const suggestions =
    percent >= 80
      ? [
          "Practice mixed tense drills twice a week.",
          "Notice article use while reading.",
        ]
      : [
          "Revise one grammar topic at a time.",
          "Make short sentences before longer answers.",
        ];

  return buildFeedback({ scoreLine, mistakes, suggestions });
}
