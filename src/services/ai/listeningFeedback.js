import { buildFeedback } from "./feedbackUtils";

export function getListeningFeedback({ percent }) {
  const scoreLine =
    percent >= 70 ? "Listening comprehension is stable." : "Listening needs more focused practice.";

  const mistakes =
    percent >= 70
      ? ["Specific detail tracking can still improve.", "Paraphrased answers may be missed."]
      : ["Key facts were missed in the audio.", "Distractor information caused confusion."];

  const suggestions =
    percent >= 70
      ? ["Practice note-taking while listening.", "Listen for signpost words."]
      : ["Replay short clips and shadow them.", "Train with names, numbers and dates."];

  return buildFeedback({ scoreLine, mistakes, suggestions });
}
