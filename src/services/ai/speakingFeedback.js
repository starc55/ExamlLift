import { buildFeedback } from "./feedbackUtils";

export function getSpeakingFeedback({ durationSeconds, context }) {
  const isExtended = durationSeconds >= 20;
  const scoreLine = isExtended
    ? `Speaking for the ${context} task was solid. Pronunciation and fluency are improving.`
    : `Speaking for the ${context} task was brief. Fluency and vocabulary need more support.`;

  const mistakes = isExtended
    ? ["Grammar slips may appear in longer sentences.", "Pronunciation stress can still be clearer."]
    : ["Fluency was limited by very short responses.", "Vocabulary range and grammar control were narrow."];

  const suggestions = isExtended
    ? ["Add one example to strengthen coherence.", "Keep practicing clear sentence stress and linking."]
    : ["Aim for at least 3 linked sentences.", "Use topic vocabulary with simple but correct grammar."];

  return buildFeedback({ scoreLine, mistakes, suggestions });
}
