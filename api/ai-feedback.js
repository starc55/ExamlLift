import OpenAI from "openai";

const MODEL = "gpt-4o-mini";
const LOCAL_SECTIONS = new Set([
  "reading",
  "listening",
  "grammar",
  "vocabulary",
]);

const CRITERIA_BY_SECTION = {
  writing: ["taskResponse", "coherence", "grammar", "vocabulary"],
  speaking: ["fluency", "vocabulary", "grammar", "pronunciation"],
  reading: ["comprehension", "detailAccuracy", "inference", "strategy"],
  listening: [
    "comprehension",
    "detailListening",
    "keywordTracking",
    "noteTaking",
  ],
  grammar: ["accuracy", "grammarControl", "topicAwareness", "correctionSkill"],
  vocabulary: ["meaningMatch", "wordRecall", "precision", "memoryStrategy"],
  homework: ["completion", "accuracy", "communication", "improvementReadiness"],
};

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured.");
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function parseJsonBody(req) {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body;
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numeric));
}

function roundToHalfBand(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.round(numeric * 2) / 2;
}

function percentageToBand(percentage) {
  const safePercentage = clampNumber(percentage, 0, 100, 0);

  if (safePercentage >= 95) return 8.5;
  if (safePercentage >= 88) return 8;
  if (safePercentage >= 80) return 7.5;
  if (safePercentage >= 72) return 7;
  if (safePercentage >= 64) return 6.5;
  if (safePercentage >= 56) return 6;
  if (safePercentage >= 48) return 5.5;
  if (safePercentage >= 40) return 5;
  return 4.5;
}

function stringifyWrongAnswers(items = [], formatter) {
  if (!items.length) {
    return "No wrong answers.";
  }

  return items
    .map((item, index) => `${index + 1}. ${formatter(item)}`)
    .join("\n");
}

function buildCommonPromptHeader(sectionTitle) {
  return `You are a professional English assessment coach.
Return only valid JSON matching the schema.
All feedback must be in Uzbek.
The "feedback" field must follow this exact structure:

Umumiy baho:
...

Xatolar:
* ...
* ...

Tavsiyalar:
* ...
* ...

Keyingi qadam:
...

Rules:
- feedback must stay within 120-150 words
- tone must be professional, constructive, supportive, and easy to understand
- mention only 2-3 meaningful mistakes and 2-3 useful suggestions
- avoid filler and repetition
- keep explanations student-friendly
- section: ${sectionTitle}`;
}

export function buildWritingPrompt(payload = {}) {
  return `${buildCommonPromptHeader("Writing")}

Assess this writing response in a practical IELTS-style way.
Evaluate:
- Task Response
- Coherence and Cohesion
- Grammar Range and Accuracy
- Lexical Resource
- Overall estimated band score

Context:
- Exam type: ${payload.examType || "unknown"}
- Level: ${payload.level || "unknown"}
- Task title: ${payload.taskTitle || "Writing task"}
- Task prompt: ${payload.taskPrompt || "No prompt provided"}

Student answer:
${payload.answer || ""}`;
}

export function buildSpeakingPrompt(payload = {}) {
  return `${buildCommonPromptHeader("Speaking")}

Assess this spoken response transcript.
Evaluate:
- Fluency and Coherence
- Lexical Resource
- Grammar Range and Accuracy
- Pronunciation estimate
- Overall estimated band score

Context:
- Exam type: ${payload.examType || "unknown"}
- Level: ${payload.level || "unknown"}
- Task title: ${payload.taskTitle || "Speaking task"}
- Prompt: ${payload.taskPrompt || "No prompt provided"}
- Duration seconds: ${payload.durationSeconds || 0}

Transcript:
${payload.transcript || ""}`;
}

export function buildReadingPrompt(payload = {}) {
  const wrongAnswers = stringifyWrongAnswers(
    payload.questionData?.wrongAnswers,
    (item) =>
      `Question: ${item.question}; Student answer: ${
        item.studentAnswer || "-"
      }; Correct answer: ${item.correctAnswer}`
  );

  return `${buildCommonPromptHeader("Reading")}

The score is already calculated locally. Do not re-score the test differently.
Use the given result to write short professional feedback about reading skill,
mistake patterns, and next practice focus.

Result:
- Score: ${payload.result?.score ?? 0}/${payload.result?.total ?? 0}
- Percentage: ${payload.result?.percentage ?? 0}%
- Estimated band baseline: ${percentageToBand(payload.result?.percentage ?? 0)}

Question context:
- Passage title: ${payload.questionData?.passageTitle || "Unknown passage"}
- Passage summary: ${
    payload.questionData?.passageSummary || "No summary provided"
  }
- Wrong answers:
${wrongAnswers}`;
}

export function buildListeningPrompt(payload = {}) {
  const wrongAnswers = stringifyWrongAnswers(
    payload.questionData?.wrongAnswers,
    (item) =>
      `Question: ${item.question}; Student answer: ${
        item.studentAnswer || "-"
      }; Correct answer: ${item.correctAnswer}`
  );

  return `${buildCommonPromptHeader("Listening")}

The score is already calculated locally. Use it to explain listening comprehension
performance, mistake patterns, and next listening strategy.

Result:
- Score: ${payload.result?.score ?? 0}/${payload.result?.total ?? 0}
- Percentage: ${payload.result?.percentage ?? 0}%
- Estimated band baseline: ${percentageToBand(payload.result?.percentage ?? 0)}

Question context:
- Audio title: ${payload.questionData?.audioTitle || "Unknown audio"}
- Topic: ${payload.questionData?.topic || "No topic provided"}
- Wrong answers:
${wrongAnswers}`;
}

export function buildGrammarPrompt(payload = {}) {
  const wrongAnswers = stringifyWrongAnswers(
    payload.questionData?.wrongAnswers,
    (item) =>
      `Question: ${item.question}; Student answer: ${
        item.studentAnswer || "-"
      }; Correct answer: ${item.correctAnswer}; Topic: ${
        item.grammarTopic || "General grammar"
      }`
  );

  return `${buildCommonPromptHeader("Grammar")}

The score is already calculated locally. Explain which grammar topics caused
trouble, what the student should notice, and suggest a short targeted practice step.

Result:
- Score: ${payload.result?.score ?? 0}/${payload.result?.total ?? 0}
- Percentage: ${payload.result?.percentage ?? 0}%
- Estimated band baseline: ${percentageToBand(payload.result?.percentage ?? 0)}

Grammar context:
${wrongAnswers}`;
}

export function buildVocabularyPrompt(payload = {}) {
  const wrongAnswers = stringifyWrongAnswers(
    payload.questionData?.wrongAnswers,
    (item) =>
      `Term: ${item.term}; Student answer: ${
        item.studentAnswer || "-"
      }; Correct answer: ${item.correctAnswer}; Meaning: ${
        item.correctDefinition || "Unknown"
      }`
  );

  return `${buildCommonPromptHeader("Vocabulary")}

The score is already calculated locally. Explain which words were confused,
what memory pattern may help, and what to revise next.

Result:
- Score: ${payload.result?.score ?? 0}/${payload.result?.total ?? 0}
- Percentage: ${payload.result?.percentage ?? 0}%
- Estimated band baseline: ${percentageToBand(payload.result?.percentage ?? 0)}

Vocabulary context:
${wrongAnswers}`;
}

export function buildHomeworkPrompt(payload = {}) {
  const homeworkType = payload.homeworkType || "general_homework";
  const localSummary = payload.result
    ? `Local result:
- Score: ${payload.result.score ?? 0}/${payload.result.total ?? 0}
- Percentage: ${payload.result.percentage ?? 0}%
- Estimated band baseline: ${percentageToBand(payload.result.percentage ?? 0)}`
    : "Local result: not provided";

  const wrongAnswers = stringifyWrongAnswers(
    payload.questionData?.wrongAnswers,
    (item) => JSON.stringify(item)
  );

  return `${buildCommonPromptHeader("Homework")}

Homework type: ${homeworkType}
Task title: ${payload.taskTitle || "Homework task"}
Instructions: ${payload.instructions || "No instructions provided"}
Level: ${payload.level || "unknown"}
Deadline: ${payload.deadline || "unknown"}

Use these rules:
- writing_homework and speaking_homework should be fully assessed
- grammar_homework, vocabulary_homework, reading_homework, listening_homework should respect the local score and only explain feedback
- file_homework should not pretend the file was deeply checked; clearly state teacher review is needed

Student answer:
${payload.answer || payload.transcript || payload.note || "No answer provided"}

${localSummary}

Wrong answers or local context:
${wrongAnswers}`;
}

function getPromptBuilder(section) {
  switch (section) {
    case "writing":
      return buildWritingPrompt;
    case "speaking":
      return buildSpeakingPrompt;
    case "reading":
      return buildReadingPrompt;
    case "listening":
      return buildListeningPrompt;
    case "grammar":
      return buildGrammarPrompt;
    case "vocabulary":
      return buildVocabularyPrompt;
    case "homework":
      return buildHomeworkPrompt;
    default:
      return null;
  }
}

function getCriteriaKeys(section) {
  return CRITERIA_BY_SECTION[section] || CRITERIA_BY_SECTION.homework;
}

function buildAssessmentSchema(section) {
  const criteriaKeys = getCriteriaKeys(section);

  return {
    type: "object",
    additionalProperties: false,
    required: ["feedback", "score", "band", "criteria"],
    properties: {
      feedback: {
        type: "string",
      },
      score: {
        type: "number",
      },
      band: {
        type: ["number", "null"],
      },
      criteria: {
        type: "object",
        additionalProperties: false,
        required: criteriaKeys,
        properties: criteriaKeys.reduce((accumulator, key) => {
          accumulator[key] = { type: "number" };
          return accumulator;
        }, {}),
      },
    },
  };
}

function normalizeFeedbackText(feedback) {
  return String(feedback || "").trim();
}

function normalizeCriteria(section, criteria = {}) {
  return getCriteriaKeys(section).reduce((accumulator, key) => {
    accumulator[key] = clampNumber(criteria[key], 0, 9, 0);
    return accumulator;
  }, {});
}

function normalizeAssessment(section, payload, parsed) {
  const normalized = {
    feedback: normalizeFeedbackText(parsed?.feedback),
    score: clampNumber(parsed?.score, 0, 100, 0),
    band:
      parsed?.band == null
        ? null
        : roundToHalfBand(clampNumber(parsed.band, 0, 9, 0)),
    criteria: normalizeCriteria(section, parsed?.criteria),
  };

  if (LOCAL_SECTIONS.has(section) || payload?.result?.percentage != null) {
    normalized.score = clampNumber(
      payload.result?.percentage,
      0,
      100,
      normalized.score
    );
    normalized.band =
      payload.result?.percentage != null
        ? roundToHalfBand(percentageToBand(payload.result.percentage))
        : normalized.band;
  }

  if (!normalized.feedback) {
    throw new Error("Empty AI response.");
  }

  return normalized;
}

function createValidationError(message, details = {}) {
  const error = new Error(message);
  error.statusCode = 400;
  error.details = details;
  return error;
}

function hasResultShape(result) {
  if (!result || typeof result !== "object") {
    return false;
  }

  return ["score", "total", "percentage"].every((key) =>
    Number.isFinite(Number(result[key]))
  );
}

function validatePayload(section, payload) {
  if (!section) {
    throw createValidationError("Section is required.", {
      field: "section",
    });
  }

  switch (section) {
    case "writing":
      if (!String(payload.answer || "").trim()) {
        throw createValidationError("Answer is required for writing.", {
          section,
          field: "answer",
        });
      }
      return;

    case "speaking":
      return;

    case "listening":
    case "reading":
    case "grammar":
    case "vocabulary":
      if (!hasResultShape(payload.result)) {
        throw createValidationError(`Result is required for ${section}.`, {
          section,
          field: "result",
          expected: {
            score: "number",
            total: "number",
            percentage: "number",
          },
        });
      }
      return;

    case "homework": {
      if (!payload.homeworkType) {
        throw createValidationError("Homework type is required.", {
          section,
          field: "homeworkType",
        });
      }

      const hasTextAnswer = Boolean(
        String(
          payload.answer || payload.transcript || payload.note || ""
        ).trim()
      );
      const isFileHomework = payload.homeworkType === "file_homework";

      if (
        !hasTextAnswer &&
        !isFileHomework &&
        !hasResultShape(payload.result)
      ) {
        throw createValidationError("Homework answer is required.", {
          section,
          field: "answer",
          homeworkType: payload.homeworkType,
        });
      }
      return;
    }

    default:
      throw createValidationError("Unsupported section.", {
        section,
      });
  }
}

export async function generateAssessment({ client, section, payload }) {
  validatePayload(section, payload);
  const promptBuilder = getPromptBuilder(section);

  if (!promptBuilder) {
    throw new Error("Unsupported section.");
  }

  const response = await client.responses.parse({
    model: MODEL,
    input: promptBuilder(payload),
    text: {
      verbosity: "medium",
      format: {
        type: "json_schema",
        name: `${section}_assessment`,
        strict: true,
        schema: buildAssessmentSchema(section),
      },
    },
  });

  return normalizeAssessment(section, payload, response.output_parsed);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const payload = parseJsonBody(req);
    const section = payload.section;
    const client = getClient();
    const result = await generateAssessment({ client, section, payload });

    return res.status(200).json(result);
  } catch (error) {
    const message = error?.message || "Failed to generate AI feedback.";
    const statusCode = error?.statusCode || 500;

    console.error("AI feedback request failed:", message);
    return res.status(statusCode).json({
      error: message,
      details: error?.details || null,
    });
  }
}
