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
    throw new Error(payload?.error || AI_ERROR_MESSAGE);
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

export async function getWritingFeedback(payload) {
  return requestJson(
    "/api/ai-feedback",
    buildJsonRequest({
      section: "writing",
      ...payload,
    })
  );
}

export async function getSpeakingFeedback(audioBlob, metadata = {}) {
  if (!audioBlob) {
    throw new Error("Audio file is required.");
  }

  const formData = new FormData();
  formData.append(
    "audio",
    audioBlob,
    metadata.fileName || "speaking-response.webm"
  );
  formData.append("metadata", JSON.stringify(metadata));

  return requestJson("/api/transcribe-speaking", {
    method: "POST",
    body: formData,
  });
}

export async function getTestFeedback(payload) {
  return requestJson("/api/ai-feedback", buildJsonRequest(payload));
}

export async function getHomeworkFeedback(payload) {
  if (payload?.homeworkType === "speaking_homework" && payload.audioBlob) {
    return getSpeakingFeedback(payload.audioBlob, payload);
  }

  return requestJson(
    "/api/ai-feedback",
    buildJsonRequest({
      section: "homework",
      ...payload,
    })
  );
}

export { AI_ERROR_MESSAGE };
