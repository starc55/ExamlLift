import { buildFeedback } from "./feedbackUtils";

export function getReadingFeedback({ percent }) {
  const scoreLine =
    percent >= 70 ? "Reading performance is developing well." : "Reading accuracy needs closer attention.";

  const mistakes =
    percent >= 70
      ? ["Scanning was good but not always exact.", "Inference questions need more care."]
      : ["Main ideas and details were mixed up.", "Question keywords were not matched carefully."];

  const suggestions =
    percent >= 70
      ? ["Underline keywords before choosing.", "Check paraphrases in the passage."]
      : ["Read the question first, then scan the text.", "Practice short passages every day."];

  return buildFeedback({ scoreLine, mistakes, suggestions });
}
