import OpenAI from "openai";

const MODEL = "gpt-4o-mini";
const SUPPORTED_LANGUAGES = new Set(["uz", "ru", "en"]);
const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const LOCAL_SECTIONS = new Set([
  "reading",
  "listening",
  "grammar",
  "vocabulary",
]);

const LANGUAGE_FORMATS = {
  uz: {
    name: "Uzbek",
    format: `Umumiy baho:
...

CEFR daraja:
...

Kuchli tomonlar:
* ...

Xatolar:
* ...

Tavsiyalar:
* ...

Keyingi qadam:
...`,
  },
  ru: {
    name: "Russian",
    format: `Общая оценка:
...

Уровень CEFR:
...

Сильные стороны:
* ...

Ошибки:
* ...

Рекомендации:
* ...

Следующий шаг:
...`,
  },
  en: {
    name: "English",
    format: `Overall evaluation:
...

CEFR level:
...

Strengths:
* ...

Mistakes:
* ...

Recommendations:
* ...

Next step:
...`,
  },
};

const CRITERIA_BY_SECTION = {
  writing: [
    "taskAchievement",
    "coherenceCohesion",
    "lexicalResource",
    "grammaticalRangeAccuracy",
  ],
  speaking: [
    "fluency",
    "grammaticalRangeAccuracy",
    "lexicalResource",
    "pronunciation",
  ],
  reading: [
    "readingComprehension",
    "detailRecognition",
    "inferenceDeduction",
    "vocabularyInContext",
    "speedEfficiency",
  ],
  listening: [
    "comprehensionUnderstanding",
    "detailRecognition",
    "inferencePrediction",
    "vocabularyInContext",
    "speedAccuracy",
  ],
  grammar: ["rangeForm", "accuracy", "appropriacy", "complexStructures"],
  vocabulary: [
    "rangeBreadth",
    "precisionAccuracy",
    "appropriacyContextualUse",
    "flexibilityParaphrasing",
  ],
  homework: ["completion", "accuracy", "communication", "improvementReadiness"],
  overall_exam: ["sectionBalance", "weaknessFocus", "learningPlan"],
};

const SECTION_RUBRICS = {
  writing: `Writing CEFR criteria from the uploaded assessment:
- Task Achievement / Response: from very limited basic information at A1 to precise, detailed, critical task completion at C2.
- Coherence and Cohesion: from fragmented sentences at A1 to fully coherent, cohesive, well-structured writing at C2.
- Lexical Resource: from very limited repeated vocabulary at A1 to sophisticated, idiomatic, stylistic vocabulary at C2.
- Grammatical Range and Accuracy: from very simple structures with frequent errors at A1 to near-perfect control at C2.`,
  speaking: `Speaking CEFR criteria from the uploaded assessment:
- Fluency: from memorized words and frequent pauses at A1 to effortless, natural discourse at C2.
- Grammatical Range and Accuracy: from very limited control at A1 to near-perfect control at C2.
- Lexical Resource: from limited everyday vocabulary at A1 to sophisticated, precise, flexible vocabulary at C2.
- Pronunciation: from unclear L1-influenced speech at A1 to near-native intelligibility at C2.`,
  reading: `Reading CEFR criteria from the uploaded assessment:
- Reading Comprehension, Detail Recognition, Inference and Deduction, Vocabulary in Context, Speed and Efficiency.
- A1 understands only very basic main ideas; B1 understands overall meaning and simple inferences; B2 handles operational documents accurately; C1-C2 read complex texts quickly with nuanced understanding.`,
  listening: `Listening CEFR criteria from the uploaded assessment:
- Comprehension / Understanding, Detail Recognition, Inference and Prediction, Vocabulary in Context, Speed and Accuracy.
- A1 catches only basic meaning; B1 understands main ideas and simple inferences; B2 handles operational briefings; C1-C2 process complex briefings quickly and accurately.`,
  grammar: `Grammar CEFR criteria from the uploaded assessment:
- Range / Form, Accuracy, Appropriacy, Complex Structures.
- A1 uses only basic forms with frequent errors; B1 uses simple and some complex structures; B2 controls a wide range; C1-C2 use complex grammar accurately and appropriately.`,
  vocabulary: `Vocabulary CEFR criteria from the uploaded assessment:
- Range / Breadth, Precision / Accuracy, Appropriacy / Contextual Use, Flexibility / Paraphrasing.
- A1 has very limited everyday vocabulary; B1 has expanded work/education vocabulary; B2 has broad professional terminology; C1-C2 are precise, flexible, idiomatic, and stylistically controlled.`,
  homework: `Homework should use the relevant CEFR criteria for its homework type. Objective homework must respect the local score; writing and speaking homework can be assessed by the AI using the writing/speaking criteria.`,
  overall_exam: `Overall exam feedback must combine section results, name the strongest section, weakest section, overall CEFR level, and a practical next learning plan.`,
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

function normalizeFeedbackLanguage(language) {
  return SUPPORTED_LANGUAGES.has(language) ? language : "uz";
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

function percentageToCEFR(percentage) {
  const safePercentage = clampNumber(percentage, 0, 100, 0);

  if (safePercentage <= 20) return "A1";
  if (safePercentage <= 40) return "A2";
  if (safePercentage <= 60) return "B1";
  if (safePercentage <= 75) return "B2";
  if (safePercentage <= 90) return "C1";
  return "C2";
}

function stringifyWrongAnswers(items = [], formatter) {
  if (!items.length) {
    return "No wrong answers.";
  }

  return items
    .map((item, index) => `${index + 1}. ${formatter(item)}`)
    .join("\n");
}

function sectionResultSummary(sectionKey, section = {}) {
  const score = section.score ?? 0;
  const total = section.totalScore ?? section.total ?? section.maxScore ?? 0;
  const percentage = section.percentage ?? section.percent ?? 0;
  const cefrLevel = section.cefrLevel || percentageToCEFR(percentage);

  return `${sectionKey}: ${score}/${total}, ${percentage}%, CEFR ${cefrLevel}`;
}

function buildCommonPromptHeader(section, payload = {}) {
  const language = normalizeFeedbackLanguage(payload.feedbackLanguage);
  const languageConfig = LANGUAGE_FORMATS[language];
  const sectionTitle = section.replace(/_/g, " ");

  return `You are a professional English assessment coach.
Return only valid JSON matching the schema.
All visible feedback text must be in ${languageConfig.name}.
The "feedback" field must follow this exact structure:

${languageConfig.format}

CEFR percentage mapping that must be respected:
- 0-20% = A1
- 21-40% = A2
- 41-60% = B1
- 61-75% = B2
- 76-90% = C1
- 91-100% = C2

Rules:
- feedback must stay within 120-150 words
- score must be a 0-100 percentage
- cefrLevel must match the score using the CEFR mapping above
- tone must be professional, constructive, supportive, and easy to understand
- include 1-3 strengths, 1-3 mistakes, and 1-3 useful recommendations
- avoid filler and repetition
- keep explanations student-friendly
- section: ${sectionTitle}

${SECTION_RUBRICS[section] || SECTION_RUBRICS.homework}`;
}

export function buildWritingPrompt(payload = {}) {
  return `${buildCommonPromptHeader("writing", payload)}

Assess this writing response using the uploaded CEFR writing criteria.
Evaluate:
- Task Achievement / Response
- Coherence and Cohesion
- Lexical Resource
- Grammatical Range and Accuracy

Context:
- Exam type: ${payload.examType || "unknown"}
- Level: ${payload.level || "unknown"}
- Task title: ${payload.taskTitle || "Writing task"}
- Task prompt: ${payload.taskPrompt || "No prompt provided"}

Student answer:
${payload.answer || ""}`;
}

export function buildSpeakingPrompt(payload = {}) {
  return `${buildCommonPromptHeader("speaking", payload)}

Assess this spoken response transcript using the uploaded CEFR speaking criteria.
Evaluate:
- Fluency
- Grammatical Range and Accuracy
- Lexical Resource
- Pronunciation

Context:
- Exam type: ${payload.examType || "unknown"}
- Level: ${payload.level || "unknown"}
- Task title: ${payload.taskTitle || "Speaking task"}
- Prompt: ${payload.taskPrompt || payload.instructions || "No prompt provided"}
- Duration seconds: ${payload.durationSeconds || 0}

Transcript:
${payload.transcript || ""}`;
}

export function buildReadingPrompt(payload = {}) {
  const percentage = payload.result?.percentage ?? 0;
  const wrongAnswers = stringifyWrongAnswers(
    payload.questionData?.wrongAnswers,
    (item) =>
      `Question: ${item.question}; Student answer: ${
        item.studentAnswer || "-"
      }; Correct answer: ${item.correctAnswer}`
  );

  return `${buildCommonPromptHeader("reading", payload)}

The score is already calculated locally. Do not re-score the test differently.
Use the result only to write CEFR-aligned reading feedback.

Result:
- Score: ${payload.result?.score ?? 0}/${payload.result?.total ?? 0}
- Percentage: ${percentage}%
- CEFR baseline: ${percentageToCEFR(percentage)}
- Estimated IELTS-style band baseline: ${percentageToBand(percentage)}

Question context:
- Passage title: ${payload.questionData?.passageTitle || "Unknown passage"}
- Passage summary: ${
    payload.questionData?.passageSummary || "No summary provided"
  }
- Wrong answers:
${wrongAnswers}`;
}

export function buildListeningPrompt(payload = {}) {
  const percentage = payload.result?.percentage ?? 0;
  const wrongAnswers = stringifyWrongAnswers(
    payload.questionData?.wrongAnswers,
    (item) =>
      `Question: ${item.question}; Student answer: ${
        item.studentAnswer || "-"
      }; Correct answer: ${item.correctAnswer}`
  );

  return `${buildCommonPromptHeader("listening", payload)}

The score is already calculated locally. Do not re-score the test differently.
Use the result only to write CEFR-aligned listening feedback.

Result:
- Score: ${payload.result?.score ?? 0}/${payload.result?.total ?? 0}
- Percentage: ${percentage}%
- CEFR baseline: ${percentageToCEFR(percentage)}
- Estimated IELTS-style band baseline: ${percentageToBand(percentage)}

Question context:
- Audio title: ${payload.questionData?.audioTitle || "Unknown audio"}
- Topic: ${payload.questionData?.topic || "No topic provided"}
- Wrong answers:
${wrongAnswers}`;
}

export function buildGrammarPrompt(payload = {}) {
  const percentage = payload.result?.percentage ?? 0;
  const wrongAnswers = stringifyWrongAnswers(
    payload.questionData?.wrongAnswers,
    (item) =>
      `Question: ${item.question}; Student answer: ${
        item.studentAnswer || "-"
      }; Correct answer: ${item.correctAnswer}; Topic: ${
        item.grammarTopic || "General grammar"
      }`
  );

  return `${buildCommonPromptHeader("grammar", payload)}

The score is already calculated locally. Do not re-score the test differently.
Use the result only to write CEFR-aligned grammar feedback.

Result:
- Score: ${payload.result?.score ?? 0}/${payload.result?.total ?? 0}
- Percentage: ${percentage}%
- CEFR baseline: ${percentageToCEFR(percentage)}
- Estimated IELTS-style band baseline: ${percentageToBand(percentage)}

Grammar context:
${wrongAnswers}`;
}

export function buildVocabularyPrompt(payload = {}) {
  const percentage = payload.result?.percentage ?? 0;
  const wrongAnswers = stringifyWrongAnswers(
    payload.questionData?.wrongAnswers,
    (item) =>
      `Term: ${item.term}; Student answer: ${
        item.studentAnswer || "-"
      }; Correct answer: ${item.correctAnswer}; Meaning: ${
        item.correctDefinition || "Unknown"
      }`
  );

  return `${buildCommonPromptHeader("vocabulary", payload)}

The score is already calculated locally. Do not re-score the test differently.
Use the result only to write CEFR-aligned vocabulary feedback.

Result:
- Score: ${payload.result?.score ?? 0}/${payload.result?.total ?? 0}
- Percentage: ${percentage}%
- CEFR baseline: ${percentageToCEFR(percentage)}
- Estimated IELTS-style band baseline: ${percentageToBand(percentage)}

Vocabulary context:
${wrongAnswers}`;
}

export function buildHomeworkPrompt(payload = {}) {
  const homeworkType = payload.homeworkType || "general_homework";
  const localSummary = payload.result
    ? `Local result:
- Score: ${payload.result.score ?? 0}/${payload.result.total ?? 0}
- Percentage: ${payload.result.percentage ?? 0}%
- CEFR baseline: ${percentageToCEFR(payload.result.percentage ?? 0)}
- Estimated IELTS-style band baseline: ${percentageToBand(
        payload.result.percentage ?? 0
      )}`
    : "Local result: not provided";

  const wrongAnswers = stringifyWrongAnswers(
    payload.questionData?.wrongAnswers,
    (item) => JSON.stringify(item)
  );

  return `${buildCommonPromptHeader("homework", payload)}

Homework type: ${homeworkType}
Task title: ${payload.taskTitle || "Homework task"}
Instructions: ${payload.instructions || "No instructions provided"}
Level: ${payload.level || "unknown"}
Deadline: ${payload.deadline || "unknown"}

Use these rules:
- writing_homework and speaking_homework should be fully assessed
- grammar_homework, vocabulary_homework, reading_homework, listening_homework must respect the local score and only explain feedback
- file_homework should not pretend the file was deeply checked; clearly state teacher review is needed

Student answer:
${payload.answer || payload.transcript || payload.note || "No answer provided"}

${localSummary}

Wrong answers or local context:
${wrongAnswers}`;
}

export function buildOverallExamPrompt(payload = {}) {
  const percentage = payload.result?.percentage ?? 0;
  const sections = Object.entries(payload.sections || {})
    .map(([key, value]) => `- ${sectionResultSummary(key, value)}`)
    .join("\n");

  return `${buildCommonPromptHeader("overall_exam", payload)}

Write one general feedback for the complete ${
    payload.examType || "exam"
  } result.
Mention:
- strongest section
- weakest section
- overall CEFR level
- short learning plan for the next stage

Overall result:
- Overall score: ${
    payload.result?.overallScore ?? payload.result?.score ?? 0
  }/${payload.result?.totalScore ?? payload.result?.total ?? 0}
- Overall percentage: ${percentage}%
- Overall CEFR: ${payload.result?.overallCEFR || percentageToCEFR(percentage)}

Section results:
${sections || "No section results provided."}`;
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
    case "overall_exam":
      return buildOverallExamPrompt;
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
    required: ["feedback", "score", "band", "cefrLevel", "criteria"],
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
      cefrLevel: {
        type: "string",
        enum: CEFR_LEVELS,
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
  const feedbackLanguage = normalizeFeedbackLanguage(payload.feedbackLanguage);
  const normalized = {
    feedback: normalizeFeedbackText(parsed?.feedback),
    score: clampNumber(parsed?.score, 0, 100, 0),
    band:
      parsed?.band == null
        ? null
        : roundToHalfBand(clampNumber(parsed.band, 0, 9, 0)),
    cefrLevel: CEFR_LEVELS.includes(parsed?.cefrLevel)
      ? parsed.cefrLevel
      : null,
    criteria: normalizeCriteria(section, parsed?.criteria),
    feedbackLanguage,
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

  normalized.cefrLevel = percentageToCEFR(normalized.score);

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

function hasOverallResultShape(result) {
  if (!result || typeof result !== "object") {
    return false;
  }

  return ["overallScore", "totalScore", "percentage"].every((key) =>
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

    case "overall_exam":
      if (!["midterm", "final"].includes(payload.examType)) {
        throw createValidationError("Valid examType is required.", {
          section,
          field: "examType",
        });
      }

      if (!hasOverallResultShape(payload.result)) {
        throw createValidationError("Overall result is required.", {
          section,
          field: "result",
        });
      }

      if (!payload.sections || typeof payload.sections !== "object") {
        throw createValidationError("Section summary is required.", {
          section,
          field: "sections",
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
    const result = await generateAssessment({
      client,
      section,
      payload: {
        ...payload,
        feedbackLanguage: normalizeFeedbackLanguage(payload.feedbackLanguage),
      },
    });

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
