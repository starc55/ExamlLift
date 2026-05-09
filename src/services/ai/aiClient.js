const AI_ERROR_MESSAGE = "AI feedback olishda xatolik yuz berdi.";

export async function getWritingFeedback(answer) {
  const response = await fetch("/api/ai-feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      section: "writing",
      answer,
    }),
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.feedback) {
    throw new Error(payload?.error || AI_ERROR_MESSAGE);
  }

  return payload.feedback;
}
