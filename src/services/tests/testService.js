import finalData from "../../data/tests/final.json";
import midtermData from "../../data/tests/midterm.json";
import { vocabularyMatchingData } from "../../data/tests/midtermVocabularyMatching";
import { contentAssets } from "../../assets/content/assetRegistry";
import { readStorage, seedStorage, writeStorage } from "../shared/storage";

const TESTS_KEY = "english-platform-tests";

function inferGrammarTopic(prompt) {
  if (prompt.includes("If I had")) {
    return "Conditionals";
  }

  if (prompt.includes("has been")) {
    return "Present perfect";
  }

  if (prompt.includes("was given")) {
    return "Passive voice";
  }

  return "General grammar";
}

const vocabularyMatchingQuestions = vocabularyMatchingData.words.map((word) => ({
  id: `vocab-match-${word.id}`,
  prompt: word.term,
  options: vocabularyMatchingData.definitions.map((definition) => definition.key),
  correctAnswer: word.correct,
}));

function buildMidtermVocabularyTest(overrides = {}) {
  return {
    id: "test-vocabulary-1",
    type: "vocabulary",
    section: "midterm",
    title: vocabularyMatchingData.title,
    stepTitle: "Vocabulary",
    instructions: vocabularyMatchingData.instruction,
    durationMinutes: 12,
    score: 30,
    level: "Intermediate",
    examType: "midterm",
    questions: vocabularyMatchingQuestions,
    matchingData: vocabularyMatchingData,
    ...overrides,
    title: vocabularyMatchingData.title,
    stepTitle: "Vocabulary",
    instructions: vocabularyMatchingData.instruction,
    questions: vocabularyMatchingQuestions,
    matchingData: vocabularyMatchingData,
  };
}

const seededTests = [
  buildMidtermVocabularyTest(),
  {
    id: "test-grammar-1",
    type: "grammar",
    section: "midterm",
    title: "Grammar Control",
    instructions: "Complete the grammar check using one correct option per item.",
    durationMinutes: 12,
    score: 30,
    level: "Intermediate",
    examType: "midterm",
    questions: midtermData.grammar.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: question.options,
      correctAnswer: question.answer,
      grammarTopic: inferGrammarTopic(question.prompt),
    })),
  },
  {
    id: "test-reading-1",
    type: "reading",
    section: "final",
    title: "Reading Sprint",
    instructions: "Read the short passage and choose the best answer.",
    durationMinutes: 15,
    score: 20,
    level: "Intermediate",
    examType: "final",
    passageTitle: finalData.reading.title,
    passage: finalData.reading.passage,
    passageSummary:
      "Short daily study and quick error review improve memory, confidence, and reduce repeated mistakes.",
    questions: finalData.reading.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: question.options,
      correctAnswer: question.answer,
    })),
  },
  {
    id: "test-listening-1",
    type: "listening",
    section: "final",
    title: "Listening Focus",
    instructions: "Listen to the audio once or twice and answer the questions.",
    durationMinutes: 14,
    score: 20,
    level: "Intermediate",
    examType: "final",
    audioUrl: contentAssets.audio[finalData.listening.audioKey],
    audioTitle: "Study Schedule Conversation",
    topic: "Improving English through regular lessons",
    questions: finalData.listening.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: question.options,
      correctAnswer: question.answer,
    })),
  },
  {
    id: "test-writing-1",
    type: "writing",
    section: "final",
    title: "Writing Task",
    instructions: "Write a structured response with an introduction, support, and conclusion.",
    durationMinutes: 25,
    score: 50,
    level: "Intermediate",
    examType: "final",
    prompt: finalData.writing.prompt,
    taskTitle: "Opinion Essay",
    questions: [],
  },
  {
    id: "test-speaking-1",
    type: "speaking",
    section: "midterm",
    title: "Speaking Task",
    instructions: "Record your answer clearly and speak in connected sentences.",
    durationMinutes: 6,
    score: 20,
    level: "Intermediate",
    examType: "midterm",
    prompt: midtermData.speaking.prompt,
    taskTitle: "Midterm Speaking Task",
    questions: [],
  },
  {
    id: "test-speaking-2",
    type: "speaking",
    section: "final",
    title: "Speaking Reflection",
    instructions: "Give a longer answer with details and a final opinion.",
    durationMinutes: 8,
    score: 30,
    level: "Intermediate",
    examType: "final",
    prompt: finalData.speaking.prompt,
    taskTitle: "Final Speaking Reflection",
    questions: [],
  },
];

function ensureTestsSeeded() {
  seedStorage(TESTS_KEY, seededTests);
}

export function getAllTests() {
  ensureTestsSeeded();
  return readStorage(TESTS_KEY, []);
}

export function getTestsBySection(section) {
  return getAllTests().filter((test) => test.section === section);
}

export function getTestByType(type, section) {
  const test = getAllTests().find((test) => {
    if (section) {
      return test.type === type && test.section === section;
    }

    return test.type === type;
  });

  if (type === "vocabulary" && section === "midterm") {
    return buildMidtermVocabularyTest(test || {});
  }

  return test;
}

export function createTest(payload) {
  const tests = getAllTests();
  const nextTest = {
    id: `test-${Date.now()}`,
    title: payload.title,
    type: payload.type,
    section: payload.section,
    instructions: payload.instructions,
    durationMinutes: Number(payload.durationMinutes) || 10,
    score: Number(payload.score) || 10,
    prompt: payload.prompt || "",
    passageTitle: payload.passageTitle || "",
    passage: payload.passage || "",
    audioUrl: payload.audioUrl || "",
    questions: payload.questions || [],
  };

  writeStorage(TESTS_KEY, [nextTest, ...tests]);
  return nextTest;
}

export function updateTest(id, updates) {
  const tests = getAllTests().map((test) =>
    test.id === id
      ? {
          ...test,
          ...updates,
          durationMinutes: Number(updates.durationMinutes ?? test.durationMinutes),
          score: Number(updates.score ?? test.score),
        }
      : test
  );

  writeStorage(TESTS_KEY, tests);
  return tests.find((test) => test.id === id) || null;
}

export function deleteTest(id) {
  const tests = getAllTests().filter((test) => test.id !== id);
  writeStorage(TESTS_KEY, tests);
}
