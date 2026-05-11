import {
  getSavedFeedbackLanguage,
  normalizeFeedbackLanguage,
} from "./feedbackLanguage";

const AI_ERROR_MESSAGE = "AI feedback olishda xatolik yuz berdi.";

async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    const error = new Error(payload?.error || AI_ERROR_MESSAGE);
    error.status = response.status;
    error.details = payload?.details || null;
    console.error("AI feedback error:", error.details || error.message);
    throw error;
  }

  if (!payload) {
    throw new Error(AI_ERROR_MESSAGE);
  }

  return payload;
}

function buildJsonRequest(body) {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function withFeedbackLanguage(payload = {}) {
  return {
    ...payload,
    feedbackLanguage: normalizeFeedbackLanguage(
      payload.feedbackLanguage || getSavedFeedbackLanguage()
    ),
  };
}

export async function getWritingFeedback(payload) {
  return requestJson(
    "/api/ai-feedback",
    buildJsonRequest({
      section: "writing",
      ...withFeedbackLanguage(payload),
    })
  );
}

export async function getSpeakingFeedback(audioBlob, metadata = {}) {
  if (!audioBlob) {
    throw new Error("Audio file is required.");
  }

  const formData = new FormData();
  const normalizedMetadata = withFeedbackLanguage(metadata);
  formData.append(
    "audio",
    audioBlob,
    normalizedMetadata.fileName || "speaking-response.webm"
  );
  formData.append("metadata", JSON.stringify(normalizedMetadata));

  return requestJson("/api/transcribe-speaking", {
    method: "POST",
    body: formData,
  });
}

export async function getTestFeedback(payload) {
  if (!payload?.section) {
    throw new Error("Section is required.");
  }

  return requestJson(
    "/api/ai-feedback",
    buildJsonRequest(withFeedbackLanguage(payload))
  );
}

export async function getOverallExamFeedback(payload) {
  return requestJson(
    "/api/ai-feedback",
    buildJsonRequest(
      withFeedbackLanguage({
        section: "overall_exam",
        ...payload,
      })
    )
  );
}

export async function getHomeworkFeedback(payload) {
  if (payload?.homeworkType === "speaking_homework" && payload.audioBlob) {
    return getSpeakingFeedback(payload.audioBlob, payload);
  }

  return requestJson(
    "/api/ai-feedback",
    buildJsonRequest({
      section: "homework",
      ...withFeedbackLanguage(payload),
    })
  );
}

export { AI_ERROR_MESSAGE };
