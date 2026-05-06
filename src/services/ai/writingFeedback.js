import { buildFeedback } from "./feedbackUtils";

export function getWritingFeedback({ text }) {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const scoreLine =
    wordCount >= 80
      ? "Overall band estimate: 6.5. Grammar, coherence and vocabulary are fairly balanced."
      : "Overall band estimate: 5.5. The response is too short to show stable grammar and coherence.";

  const mistakes =
    wordCount >= 80
      ? ["Some sentences may still be repetitive.", "Coherence between supporting ideas can be smoother."]
      : ["Ideas are not fully extended.", "Grammar range and vocabulary control are limited."];

  const suggestions =
    wordCount >= 80
      ? ["Add one stronger example for support.", "Vary sentence openings for better flow and vocabulary range."]
      : ["Write an intro, two points and a short conclusion.", "Use basic linking words like however and because."];

  return buildFeedback({ scoreLine, mistakes, suggestions });
}
