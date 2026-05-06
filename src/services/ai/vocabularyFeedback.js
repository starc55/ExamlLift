import { buildFeedback } from "./feedbackUtils";

export function getVocabularyFeedback({ percent }) {
  const scoreLine =
    percent >= 80 ? "Strong vocabulary control." : "Vocabulary needs more review.";

  const mistakes =
    percent >= 80
      ? ["A few distractor options still slowed you down.", "Synonym precision can improve."]
      : ["Some word meanings were confused.", "Context clues were not used consistently."];

  const suggestions =
    percent >= 80
      ? ["Review collocations for higher band answers.", "Keep a weekly synonym list."]
      : ["Study words in short example sentences.", "Repeat 10 travel and academic words daily."];

  return buildFeedback({ scoreLine, mistakes, suggestions });
}
