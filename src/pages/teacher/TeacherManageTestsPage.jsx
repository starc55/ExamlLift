import { useMemo, useState } from "react";
import {
  FaChartSimple,
  FaClock,
  FaLayerGroup,
  FaListCheck,
  FaPenToSquare,
  FaPlus,
  FaTrashCan,
} from "react-icons/fa6";
import DashboardCard from "../../components/dashboard/DashboardCard";
import ErrorAlert from "../../components/feedback/ErrorAlert";
import Modal from "../../components/layout/Modal";
import { getTeacherClasses } from "../../services/classes/classService";
import {
  createTest,
  deleteTest,
  getTeacherTests,
  updateTest,
} from "../../services/tests/testService";
import { useSafeAsyncEffect } from "../../hooks/useSafeAsyncEffect";

const EXAM_TYPE_OPTIONS = ["midterm", "final", "practice", "homework"];
const SECTION_OPTIONS = [
  "vocabulary",
  "grammar",
  "reading",
  "listening",
  "writing",
  "speaking",
];
const SECTION_OPTIONS_BY_EXAM_TYPE = {
  midterm: ["vocabulary", "grammar", "speaking"],
  final: ["reading", "listening", "writing", "speaking"],
  practice: SECTION_OPTIONS,
  homework: SECTION_OPTIONS,
};
const TASK_TYPES_BY_SECTION = {
  vocabulary: ["vocabulary_matching"],
  grammar: [
    "multiple_choice",
    "grammar_gap_fill",
    "choose_correct_form",
    "correct_mistakes",
  ],
  reading: ["multiple_choice", "true_false_not_given", "matching"],
  listening: ["multiple_choice"],
  writing: ["writing_task"],
  speaking: ["speaking_prompt", "picture_comparison", "personal_questions"],
};
const TASK_TITLE_BY_TYPE = {
  multiple_choice: "TASK 1 - MULTIPLE CHOICE",
  grammar_gap_fill: "TASK 2 - GAP FILL",
  choose_correct_form: "TASK 3 - Choose the correct answer",
  vocabulary_matching: "TASK 4 - MATCHING",
  correct_mistakes: "TASK 5 - CORRECT THE MISTAKES",
  writing_task: "Writing task",
  speaking_prompt: "Speaking prompt",
  picture_comparison: "Picture comparison",
  personal_questions: "Personal questions",
  true_false_not_given: "True / False / Not Given",
  matching: "Matching",
};
const TASK_INSTRUCTION_BY_TYPE = {
  multiple_choice: "Choose the correct answer.",
  grammar_gap_fill:
    "Complete the sentences using the correct form of the verbs in brackets.",
  choose_correct_form: "Choose the correct form.",
  vocabulary_matching: "Match the words with the correct definitions.",
  correct_mistakes: "Rewrite the sentences correctly.",
  writing_task: "Write your answer.",
  speaking_prompt: "Record your answer.",
  picture_comparison: "Compare the pictures and explain your answer.",
  personal_questions: "Answer the personal questions.",
  true_false_not_given: "Choose the correct statement type.",
  matching: "Match the items correctly.",
};
const EXAM_TYPE_LABELS = {
  midterm: "Midterm Control",
  final: "Final Exam",
  practice: "Practice",
  homework: "Homework",
};
const EXAM_TYPE_HELPER_TEXT = {
  final:
    "Final exam faqat Reading, Listening, Writing va Speaking sectionlaridan iborat.",
  midterm:
    "Midterm faqat Vocabulary, Grammar va Speaking sectionlaridan iborat.",
};
const OPTION_KEYS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const DEFINITION_KEYS = "abcdefghijklmnopqrstuvwxyz".split("");

function formatLabel(value) {
  return String(value)
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
}

function createOption(index, text = "") {
  return {
    key: OPTION_KEYS[index] || String(index + 1),
    text,
  };
}

function normalizeOptions(options = [], minimum = 2) {
  const source = options.length ? options : Array.from({ length: minimum });

  return source.map((option, index) =>
    typeof option === "string"
      ? createOption(index, option)
      : createOption(
          index,
          option?.text || option?.label || option?.value || ""
        )
  );
}

function createChoiceQuestion(taskType = "multiple_choice") {
  const optionCount = taskType === "choose_correct_form" ? 2 : 4;

  return {
    id: createId("question"),
    prompt: "",
    sentence: "",
    options: Array.from({ length: optionCount }, (_, index) =>
      createOption(index)
    ),
    correctAnswer: "",
  };
}

function createGapQuestion() {
  return {
    id: createId("gap"),
    sentence: "",
    baseWord: "",
    correctAnswer: "",
  };
}

function createMistakeQuestion() {
  return {
    id: createId("mistake"),
    incorrectSentence: "",
    correctAnswer: "",
  };
}

function createDefinition(index) {
  return {
    key: DEFINITION_KEYS[index] || String(index + 1),
    text: "",
  };
}

function createMatchingWord(index) {
  return {
    id: index + 1,
    term: "",
    correctAnswer: "",
  };
}

function getAllowedSections(examType) {
  return SECTION_OPTIONS_BY_EXAM_TYPE[examType] || SECTION_OPTIONS;
}

function getAllowedTaskTypes(section) {
  return TASK_TYPES_BY_SECTION[section] || ["multiple_choice"];
}

function getDefaultTaskType(section) {
  return getAllowedTaskTypes(section)[0];
}

function createQuestionsForTask(taskType) {
  if (taskType === "grammar_gap_fill") {
    return [createGapQuestion()];
  }

  if (taskType === "correct_mistakes") {
    return [createMistakeQuestion()];
  }

  if (
    [
      "writing_task",
      "speaking_prompt",
      "picture_comparison",
      "personal_questions",
    ].includes(taskType)
  ) {
    return [];
  }

  return [createChoiceQuestion(taskType)];
}

function createTask(taskType) {
  return {
    id: createId("task"),
    taskType,
    title: TASK_TITLE_BY_TYPE[taskType] || formatLabel(taskType),
    instructions: TASK_INSTRUCTION_BY_TYPE[taskType] || "",
    prompt: "",
    questions: createQuestionsForTask(taskType),
    words: Array.from({ length: 10 }, (_, index) => createMatchingWord(index)),
    definitions: Array.from({ length: 10 }, (_, index) =>
      createDefinition(index)
    ),
  };
}

function createEmptyForm(classId = "") {
  const section = "vocabulary";
  const taskType = getDefaultTaskType(section);

  return {
    id: null,
    classId,
    title: "",
    examType: "midterm",
    section,
    instructions: "",
    durationMinutes: 10,
    score: 10,
    passageTitle: "",
    passage: "",
    audioUrl: "",
    tasks: [createTask(taskType)],
  };
}

function normalizeTaskForType(task) {
  const taskType = task.taskType;

  if (taskType === "vocabulary_matching") {
    return {
      ...createTask(taskType),
      ...task,
      words: task.words?.length ? task.words : createTask(taskType).words,
      definitions: task.definitions?.length
        ? task.definitions
        : createTask(taskType).definitions,
    };
  }

  return {
    ...createTask(taskType),
    ...task,
    questions: task.questions?.length
      ? task.questions
      : createQuestionsForTask(taskType),
  };
}

function normalizeFormForRules(form) {
  const allowedSections = getAllowedSections(form.examType);
  const section = allowedSections.includes(form.section)
    ? form.section
    : allowedSections[0];
  const allowedTaskTypes = getAllowedTaskTypes(section);
  const safeTasks = (form.tasks || [])
    .filter((task) => allowedTaskTypes.includes(task.taskType))
    .map(normalizeTaskForType);

  return {
    ...form,
    section,
    tasks: safeTasks.length ? safeTasks : [createTask(allowedTaskTypes[0])],
  };
}

function getQuestionCount(test) {
  if (!test.tasks?.length) {
    return test.questions?.length || 0;
  }

  return test.tasks.reduce((total, task) => {
    if (task.taskType === "vocabulary_matching") {
      return (
        total + (task.words?.length || test.matchingData?.words?.length || 0)
      );
    }

    return total + (task.questions?.length || 0);
  }, 0);
}

function editableTaskFromSaved(task) {
  const base = createTask(task.taskType || "multiple_choice");

  if (task.taskType === "vocabulary_matching") {
    return {
      ...base,
      ...task,
      words: (task.words || []).map((word, index) => ({
        id: word.id || index + 1,
        term: word.term || "",
        correctAnswer: word.correctAnswer || word.correct || "",
      })),
      definitions: task.definitions || base.definitions,
    };
  }

  if (task.taskType === "grammar_gap_fill") {
    return {
      ...base,
      ...task,
      questions: (task.questions?.length ? task.questions : base.questions).map(
        (question) => ({
          id: question.id || createId("gap"),
          sentence: question.sentence || question.prompt || "",
          baseWord: question.baseWord || "",
          correctAnswer: question.correctAnswer || "",
        })
      ),
    };
  }

  if (task.taskType === "correct_mistakes") {
    return {
      ...base,
      ...task,
      questions: (task.questions?.length ? task.questions : base.questions).map(
        (question) => ({
          id: question.id || createId("mistake"),
          incorrectSentence:
            question.incorrectSentence || question.prompt || "",
          correctAnswer: question.correctAnswer || "",
        })
      ),
    };
  }

  return {
    ...base,
    ...task,
    questions: (task.questions?.length ? task.questions : base.questions).map(
      (question) => ({
        id: question.id || createId("question"),
        prompt: question.prompt || question.sentence || "",
        sentence: question.sentence || question.prompt || "",
        options: normalizeOptions(
          question.options,
          task.taskType === "choose_correct_form" ? 2 : 4
        ),
        correctAnswer: question.correctAnswer || "",
      })
    ),
  };
}

function legacyTaskFromTest(test) {
  const section = test.type || test.section || "grammar";
  const taskType =
    test.taskType || test.questionType || getDefaultTaskType(section);

  if (section === "vocabulary") {
    const matchingData = test.matchingData || {};
    return editableTaskFromSaved({
      taskType: "vocabulary_matching",
      title:
        matchingData.title ||
        test.taskTitle ||
        TASK_TITLE_BY_TYPE.vocabulary_matching,
      instructions: matchingData.instruction || test.instructions || "",
      words: matchingData.words || [],
      definitions: matchingData.definitions || [],
    });
  }

  if (["writing", "speaking"].includes(section)) {
    return editableTaskFromSaved({
      taskType,
      title: test.taskTitle || TASK_TITLE_BY_TYPE[taskType],
      instructions: test.instructions || "",
      prompt: test.prompt || "",
      questions: [],
    });
  }

  return editableTaskFromSaved({
    taskType,
    title: test.taskTitle || TASK_TITLE_BY_TYPE[taskType],
    instructions: test.instructions || "",
    questions: test.questions || [],
  });
}

function testToForm(test) {
  const section = test.type || test.section || "vocabulary";
  const tasks = test.tasks?.length
    ? test.tasks.map(editableTaskFromSaved)
    : [legacyTaskFromTest(test)];

  return normalizeFormForRules({
    ...createEmptyForm(test.classId || ""),
    id: test.id,
    classId: test.classId || "",
    title: test.title || "",
    examType: test.examType || test.section || "practice",
    section,
    instructions: test.instructions || "",
    durationMinutes: test.durationMinutes || 10,
    score: test.score || 10,
    passageTitle: test.passageTitle || "",
    passage: test.passage || "",
    audioUrl: test.audioUrl || "",
    tasks,
  });
}

function getTaskPayload(task) {
  const baseTask = {
    taskType: task.taskType,
    title: task.title.trim() || TASK_TITLE_BY_TYPE[task.taskType],
    instructions: task.instructions.trim(),
  };

  if (task.taskType === "vocabulary_matching") {
    return {
      ...baseTask,
      words: task.words.map((word, index) => ({
        id: word.id || index + 1,
        term: word.term.trim(),
        correctAnswer: word.correctAnswer,
      })),
      definitions: task.definitions.map((definition, index) => ({
        key: definition.key || DEFINITION_KEYS[index] || String(index + 1),
        text: definition.text.trim(),
      })),
    };
  }

  if (task.taskType === "grammar_gap_fill") {
    return {
      ...baseTask,
      questions: task.questions.map((question, index) => ({
        id: question.id || index + 1,
        sentence: question.sentence.trim(),
        baseWord: question.baseWord.trim(),
        correctAnswer: question.correctAnswer.trim(),
      })),
    };
  }

  if (task.taskType === "correct_mistakes") {
    return {
      ...baseTask,
      questions: task.questions.map((question, index) => ({
        id: question.id || index + 1,
        incorrectSentence: question.incorrectSentence.trim(),
        correctAnswer: question.correctAnswer.trim(),
      })),
    };
  }

  if (
    [
      "writing_task",
      "speaking_prompt",
      "picture_comparison",
      "personal_questions",
    ].includes(task.taskType)
  ) {
    return {
      ...baseTask,
      prompt: task.prompt.trim(),
      questions: [],
    };
  }

  return {
    ...baseTask,
    questions: task.questions.map((question, index) => ({
      id: question.id || index + 1,
      prompt: (task.taskType === "choose_correct_form"
        ? question.sentence
        : question.prompt
      ).trim(),
      sentence: (question.sentence || question.prompt || "").trim(),
      options: question.options.map((option, optionIndex) => ({
        key: OPTION_KEYS[optionIndex] || String(optionIndex + 1),
        text: option.text.trim(),
      })),
      correctAnswer: question.correctAnswer,
    })),
  };
}

function validateTask(task, index) {
  const errors = [];
  const taskNumber = index + 1;
  const payload = getTaskPayload(task);

  if (!payload.title) {
    errors.push(`Task ${taskNumber}: task title required.`);
  }

  if (task.taskType === "vocabulary_matching") {
    if (payload.words.length < 2 || payload.definitions.length < 2) {
      errors.push(`Task ${taskNumber}: kamida 2 ta word va definition kerak.`);
    }

    if (payload.words.length !== payload.definitions.length) {
      errors.push(
        `Task ${taskNumber}: words va definitions soni teng bo'lishi kerak.`
      );
    }

    if (payload.words.some((word) => !word.term || !word.correctAnswer)) {
      errors.push(`Task ${taskNumber}: har bir word uchun mapping majburiy.`);
    }

    if (payload.definitions.some((definition) => !definition.text)) {
      errors.push(`Task ${taskNumber}: har bir definition matni majburiy.`);
    }

    return errors;
  }

  if (
    [
      "writing_task",
      "speaking_prompt",
      "picture_comparison",
      "personal_questions",
    ].includes(task.taskType)
  ) {
    if (!payload.prompt) {
      errors.push(`Task ${taskNumber}: prompt required.`);
    }
    return errors;
  }

  if (!payload.questions?.length) {
    errors.push(`Task ${taskNumber}: at least 1 question required.`);
    return errors;
  }

  payload.questions.forEach((question, questionIndex) => {
    const label = `Task ${taskNumber}, question ${questionIndex + 1}`;

    if (task.taskType === "grammar_gap_fill") {
      if (!question.sentence || !question.correctAnswer) {
        errors.push(`${label}: sentence and correct answer required.`);
      }
      return;
    }

    if (task.taskType === "correct_mistakes") {
      if (!question.incorrectSentence || !question.correctAnswer) {
        errors.push(
          `${label}: incorrect sentence and correct answer required.`
        );
      }
      return;
    }

    const optionCount = question.options.filter((option) => option.text).length;
    const optionKeys = question.options.map((option) => option.key);

    if (!question.prompt) {
      errors.push(`${label}: question/sentence required.`);
    }

    if (optionCount < 2) {
      errors.push(`${label}: minimum 2 options required.`);
    }

    if (!question.correctAnswer) {
      errors.push(`${label}: correct answer required.`);
    } else if (!optionKeys.includes(question.correctAnswer)) {
      errors.push(`${label}: correct answer must match an option.`);
    }
  });

  return errors;
}

function validateForm(form) {
  const errors = [];

  if (!form.title.trim()) errors.push("Title required.");
  if (!form.examType) errors.push("Exam type required.");
  if (!form.section) errors.push("Section required.");

  if (!getAllowedSections(form.examType).includes(form.section)) {
    errors.push("Selected section bu exam type uchun ruxsat etilmagan.");
  }

  if (!form.tasks.length) {
    errors.push("At least 1 task required.");
  }

  form.tasks.forEach((task, index) => {
    if (!getAllowedTaskTypes(form.section).includes(task.taskType)) {
      errors.push(
        `Task ${
          index + 1
        }: selected task type bu section uchun ruxsat etilmagan.`
      );
    }
    errors.push(...validateTask(task, index));
  });

  return errors;
}

function buildPayload(form) {
  const tasks = form.tasks.map(getTaskPayload);
  const questions = tasks.flatMap((task) => task.questions || []);
  const vocabularyTask = tasks.find(
    (task) => task.taskType === "vocabulary_matching"
  );
  const promptTask = tasks.find((task) => task.prompt);
  const matchingData = vocabularyTask
    ? {
        title: vocabularyTask.title,
        instruction: vocabularyTask.instructions || form.instructions,
        words: vocabularyTask.words.map((word) => ({
          id: word.id,
          term: word.term,
          correct: word.correctAnswer,
          correctAnswer: word.correctAnswer,
        })),
        definitions: vocabularyTask.definitions,
      }
    : null;

  return {
    id: form.id,
    classId: form.classId,
    title: form.title,
    examType: form.examType,
    section: form.examType,
    type: form.section,
    taskType: tasks[0]?.taskType || getDefaultTaskType(form.section),
    questionType: tasks[0]?.taskType || getDefaultTaskType(form.section),
    taskTitle: tasks[0]?.title || form.title,
    instructions: form.instructions,
    durationMinutes: form.durationMinutes,
    score: form.score,
    prompt: promptTask?.prompt || "",
    passageTitle: form.passageTitle,
    passage: form.passage,
    audioUrl: form.audioUrl,
    tasks,
    questions,
    matchingData,
  };
}

function TeacherManageTestsPage() {
  const [tests, setTests] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [form, setForm] = useState(createEmptyForm());
  const [newTaskType, setNewTaskType] = useState(
    getDefaultTaskType("vocabulary")
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [examTypeFilter, setExamTypeFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const availableSections = useMemo(
    () => getAllowedSections(form.examType),
    [form.examType]
  );
  const availableTaskTypes = useMemo(
    () => getAllowedTaskTypes(form.section),
    [form.section]
  );
  const currentValidationErrors = validateForm(normalizeFormForRules(form));
  const midtermCount = tests.filter(
    (test) => test.section === "midterm"
  ).length;
  const finalCount = tests.filter((test) => test.section === "final").length;
  const totalQuestions = tests.reduce(
    (total, test) => total + getQuestionCount(test),
    0
  );

  const filteredTests = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return tests.filter((test) => {
      const taskTypes = (test.tasks || []).map((task) => task.taskType);
      const searchableValues = [
        test.title,
        test.instructions,
        test.type,
        test.section,
        test.examType,
        ...taskTypes,
      ];
      const matchesSearch =
        !normalizedSearch ||
        searchableValues
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedSearch)
          );
      const matchesExamType =
        examTypeFilter === "all" || test.section === examTypeFilter;
      const matchesSection =
        sectionFilter === "all" || test.type === sectionFilter;

      return matchesSearch && matchesExamType && matchesSection;
    });
  }, [examTypeFilter, searchTerm, sectionFilter, tests]);

  useSafeAsyncEffect(
    "teacher-manage-tests",
    async ({ safeSet }) => {
      safeSet(() => {
        setLoading(true);
        setError("");
      });

      try {
        const [nextClasses, nextTests] = await Promise.all([
          getTeacherClasses(),
          getTeacherTests(),
        ]);

        safeSet(() => {
          setClasses(nextClasses);
          setTests(nextTests);
        });
      } catch (requestError) {
        safeSet(() => {
          setError(requestError.message);
        });
      } finally {
        safeSet(() => {
          setLoading(false);
        });
      }
    },
    []
  );

  const updateForm = (updater) => {
    setForm((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      return normalizeFormForRules(next);
    });
  };

  const openCreateModal = () => {
    const nextForm = createEmptyForm(classes[0]?.id || "");
    setForm(nextForm);
    setNewTaskType(getDefaultTaskType(nextForm.section));
    setActiveStep(1);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (test) => {
    const nextForm = testToForm(test);
    setForm(nextForm);
    setNewTaskType(getDefaultTaskType(nextForm.section));
    setActiveStep(1);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleExamTypeChange = (examType) => {
    const allowedSections = getAllowedSections(examType);
    const nextSection = allowedSections.includes(form.section)
      ? form.section
      : allowedSections[0];
    setNewTaskType(getDefaultTaskType(nextSection));
    updateForm((current) => ({
      ...current,
      examType,
    }));
  };

  const handleSectionChange = (section) => {
    const taskType = getDefaultTaskType(section);
    setNewTaskType(taskType);
    updateForm((current) => ({
      ...current,
      section,
      tasks: [createTask(taskType)],
    }));
  };

  const updateTask = (taskId, patch) => {
    updateForm((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === taskId ? normalizeTaskForType({ ...task, ...patch }) : task
      ),
    }));
  };

  const addTask = () => {
    updateForm((current) => ({
      ...current,
      tasks: [...current.tasks, createTask(newTaskType)],
    }));
  };

  const removeTask = (taskId) => {
    updateForm((current) => ({
      ...current,
      tasks:
        current.tasks.length > 1
          ? current.tasks.filter((task) => task.id !== taskId)
          : current.tasks,
    }));
  };

  const updateQuestion = (taskId, questionId, patch) => {
    updateTask(taskId, {
      questions: form.tasks
        .find((task) => task.id === taskId)
        ?.questions.map((question) =>
          question.id === questionId ? { ...question, ...patch } : question
        ),
    });
  };

  const addQuestion = (taskId) => {
    const task = form.tasks.find((item) => item.id === taskId);
    updateTask(taskId, {
      questions: [
        ...(task?.questions || []),
        createQuestionsForTask(task.taskType)[0],
      ],
    });
  };

  const duplicateQuestion = (taskId, questionId) => {
    const task = form.tasks.find((item) => item.id === taskId);
    const question = task?.questions.find((item) => item.id === questionId);

    if (!task || !question) return;

    updateTask(taskId, {
      questions: [
        ...task.questions,
        {
          ...question,
          id: createId("question"),
          options: question.options?.map((option) => ({ ...option })) || [],
        },
      ],
    });
  };

  const removeQuestion = (taskId, questionId) => {
    const task = form.tasks.find((item) => item.id === taskId);

    updateTask(taskId, {
      questions:
        task?.questions.length > 1
          ? task.questions.filter((question) => question.id !== questionId)
          : task?.questions || [],
    });
  };

  const updateOption = (taskId, questionId, optionIndex, text) => {
    const task = form.tasks.find((item) => item.id === taskId);
    const questions = task?.questions.map((question) => {
      if (question.id !== questionId) return question;

      return {
        ...question,
        options: question.options.map((option, index) =>
          index === optionIndex ? { ...option, text } : option
        ),
      };
    });

    updateTask(taskId, { questions });
  };

  const addOption = (taskId, questionId) => {
    const task = form.tasks.find((item) => item.id === taskId);
    const questions = task?.questions.map((question) => {
      if (question.id !== questionId) return question;

      return {
        ...question,
        options: [...question.options, createOption(question.options.length)],
      };
    });

    updateTask(taskId, { questions });
  };

  const removeOption = (taskId, questionId, optionIndex) => {
    const task = form.tasks.find((item) => item.id === taskId);
    const questions = task?.questions.map((question) => {
      if (question.id !== questionId || question.options.length <= 2) {
        return question;
      }

      const removedKey = question.options[optionIndex]?.key;
      const options = normalizeOptions(
        question.options.filter((_, index) => index !== optionIndex),
        2
      );

      return {
        ...question,
        options,
        correctAnswer:
          question.correctAnswer === removedKey ? "" : question.correctAnswer,
      };
    });

    updateTask(taskId, { questions });
  };

  const updateWord = (taskId, index, patch) => {
    const task = form.tasks.find((item) => item.id === taskId);
    updateTask(taskId, {
      words: task.words.map((word, wordIndex) =>
        wordIndex === index ? { ...word, ...patch } : word
      ),
    });
  };

  const addWord = (taskId) => {
    const task = form.tasks.find((item) => item.id === taskId);
    updateTask(taskId, {
      words: [...task.words, createMatchingWord(task.words.length)],
    });
  };

  const removeWord = (taskId, index) => {
    const task = form.tasks.find((item) => item.id === taskId);
    updateTask(taskId, {
      words:
        task.words.length > 2
          ? task.words.filter((_, wordIndex) => wordIndex !== index)
          : task.words,
    });
  };

  const updateDefinition = (taskId, index, text) => {
    const task = form.tasks.find((item) => item.id === taskId);
    updateTask(taskId, {
      definitions: task.definitions.map((definition, definitionIndex) =>
        definitionIndex === index ? { ...definition, text } : definition
      ),
    });
  };

  const addDefinition = (taskId) => {
    const task = form.tasks.find((item) => item.id === taskId);
    updateTask(taskId, {
      definitions: [
        ...task.definitions,
        createDefinition(task.definitions.length),
      ],
    });
  };

  const removeDefinition = (taskId, index) => {
    const task = form.tasks.find((item) => item.id === taskId);

    if (task.definitions.length <= 2) return;

    const removedKey = task.definitions[index]?.key;
    const definitions = task.definitions
      .filter((_, definitionIndex) => definitionIndex !== index)
      .map((definition, definitionIndex) => ({
        ...definition,
        key: DEFINITION_KEYS[definitionIndex] || String(definitionIndex + 1),
      }));

    updateTask(taskId, {
      definitions,
      words: task.words.map((word) => ({
        ...word,
        correctAnswer:
          word.correctAnswer === removedKey ? "" : word.correctAnswer,
      })),
    });
  };

  const handleDelete = async (testId) => {
    const confirmed = window.confirm(
      "Delete this test block? This cannot be undone."
    );

    if (!confirmed) return;

    try {
      await deleteTest(testId);
      setTests((current) => current.filter((item) => item.id !== testId));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const goToStep = (step) => {
    setFormError("");
    setActiveStep(step);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setFormError("");

    const normalizedForm = normalizeFormForRules(form);
    const validationErrors = validateForm(normalizedForm);

    if (validationErrors.length) {
      setFormError(validationErrors[0]);
      setActiveStep(4);
      setSaving(false);
      return;
    }

    const payload = buildPayload(normalizedForm);

    try {
      if (!payload.classId) {
        throw new Error("Avval class tanlang.");
      }

      const savedTest = normalizedForm.id
        ? await updateTest(normalizedForm.id, payload)
        : await createTest(payload);

      setTests((current) =>
        normalizedForm.id
          ? current.map((item) => (item.id === savedTest.id ? savedTest : item))
          : [savedTest, ...current]
      );
      setIsModalOpen(false);
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const renderQuestionActions = (task, question) => (
    <div className="card-actions">
      <button
        type="button"
        className="secondary-button"
        onClick={() => duplicateQuestion(task.id, question.id)}
      >
        Duplicate
      </button>
      <button
        type="button"
        className="danger-button danger-button--subtle"
        onClick={() => removeQuestion(task.id, question.id)}
        disabled={task.questions.length === 1}
      >
        Remove
      </button>
    </div>
  );

  const renderChoiceBuilder = (task) => (
    <div className="manage-test-form__stack">
      {task.questions.map((question, questionIndex) => (
        <div key={question.id} className="question-builder__card">
          <div className="question-builder__card-header">
            <span className="pill pill--soft">
              Question {questionIndex + 1}
            </span>
            {renderQuestionActions(task, question)}
          </div>
          <label>
            {task.taskType === "choose_correct_form" ? "Sentence" : "Question"}
            <input
              value={
                task.taskType === "choose_correct_form"
                  ? question.sentence
                  : question.prompt
              }
              onChange={(event) =>
                updateQuestion(
                  task.id,
                  question.id,
                  task.taskType === "choose_correct_form"
                    ? {
                        sentence: event.target.value,
                        prompt: event.target.value,
                      }
                    : {
                        prompt: event.target.value,
                        sentence: event.target.value,
                      }
                )
              }
            />
          </label>
          <div className="manage-test-form__stack">
            {question.options.map((option, optionIndex) => (
              <div key={option.key} className="question-builder__option-row">
                <label>
                  Option {option.key}
                  <input
                    value={option.text}
                    onChange={(event) =>
                      updateOption(
                        task.id,
                        question.id,
                        optionIndex,
                        event.target.value
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  className="danger-button danger-button--subtle"
                  onClick={() =>
                    removeOption(task.id, question.id, optionIndex)
                  }
                  disabled={question.options.length <= 2}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="secondary-button card-link"
            onClick={() => addOption(task.id, question.id)}
          >
            Add option
          </button>
          <label>
            Correct answer
            <select
              value={question.correctAnswer}
              onChange={(event) =>
                updateQuestion(task.id, question.id, {
                  correctAnswer: event.target.value,
                })
              }
            >
              <option value="">Select correct answer</option>
              {question.options.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.key}: {option.text || `Option ${option.key}`}
                </option>
              ))}
            </select>
          </label>
        </div>
      ))}
      <button
        type="button"
        className="secondary-button secondary-button--with-icon card-link"
        onClick={() => addQuestion(task.id)}
      >
        <FaPlus />
        <span>Add question</span>
      </button>
    </div>
  );

  const renderGapBuilder = (task) => (
    <div className="manage-test-form__stack">
      {task.questions.map((question, index) => (
        <div key={question.id} className="question-builder__card">
          <div className="question-builder__card-header">
            <span className="pill pill--soft">Sentence {index + 1}</span>
            {renderQuestionActions(task, question)}
          </div>
          <label>
            Sentence with blank
            <input
              value={question.sentence}
              onChange={(event) =>
                updateQuestion(task.id, question.id, {
                  sentence: event.target.value,
                })
              }
              placeholder="My younger brother ___ (be) interested..."
            />
          </label>
          <div className="form-grid">
            <label>
              Bracket/base word
              <input
                value={question.baseWord}
                onChange={(event) =>
                  updateQuestion(task.id, question.id, {
                    baseWord: event.target.value,
                  })
                }
                placeholder="be"
              />
            </label>
            <label>
              Correct answer
              <input
                value={question.correctAnswer}
                onChange={(event) =>
                  updateQuestion(task.id, question.id, {
                    correctAnswer: event.target.value,
                  })
                }
                placeholder="is"
              />
            </label>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="secondary-button secondary-button--with-icon card-link"
        onClick={() => addQuestion(task.id)}
      >
        <FaPlus />
        <span>Add sentence</span>
      </button>
    </div>
  );

  const renderMistakeBuilder = (task) => (
    <div className="manage-test-form__stack">
      {task.questions.map((question, index) => (
        <div key={question.id} className="question-builder__card">
          <div className="question-builder__card-header">
            <span className="pill pill--soft">Sentence {index + 1}</span>
            {renderQuestionActions(task, question)}
          </div>
          <label>
            Incorrect sentence
            <input
              value={question.incorrectSentence}
              onChange={(event) =>
                updateQuestion(task.id, question.id, {
                  incorrectSentence: event.target.value,
                })
              }
            />
          </label>
          <label>
            Correct answer
            <input
              value={question.correctAnswer}
              onChange={(event) =>
                updateQuestion(task.id, question.id, {
                  correctAnswer: event.target.value,
                })
              }
            />
          </label>
        </div>
      ))}
      <button
        type="button"
        className="secondary-button secondary-button--with-icon card-link"
        onClick={() => addQuestion(task.id)}
      >
        <FaPlus />
        <span>Add sentence</span>
      </button>
    </div>
  );

  const renderVocabularyBuilder = (task) => (
    <div className="manage-test-form__stack">
      <div className="question-builder__heading">
        <div>
          <p className="eyebrow">Vocabulary matching</p>
          <h3>Words and definitions</h3>
        </div>
        <div className="card-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => addWord(task.id)}
          >
            Add word
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => addDefinition(task.id)}
          >
            Add definition
          </button>
        </div>
      </div>
      <div className="form-grid">
        <section className="question-builder__card">
          <h4>Words</h4>
          {task.words.map((word, index) => (
            <div
              key={`${word.id}-${index}`}
              className="question-builder__option-row"
            >
              <label>
                {index + 1}. Word
                <input
                  value={word.term}
                  onChange={(event) =>
                    updateWord(task.id, index, { term: event.target.value })
                  }
                />
              </label>
              <label>
                Correct definition
                <select
                  value={word.correctAnswer}
                  onChange={(event) =>
                    updateWord(task.id, index, {
                      correctAnswer: event.target.value,
                    })
                  }
                >
                  <option value="">Select</option>
                  {task.definitions.map((definition) => (
                    <option key={definition.key} value={definition.key}>
                      {definition.key}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="danger-button danger-button--subtle"
                onClick={() => removeWord(task.id, index)}
                disabled={task.words.length <= 2}
              >
                Remove
              </button>
            </div>
          ))}
        </section>
        <section className="question-builder__card">
          <h4>Definitions</h4>
          {task.definitions.map((definition, index) => (
            <div key={definition.key} className="question-builder__option-row">
              <label>
                Definition {definition.key}
                <input
                  value={definition.text}
                  onChange={(event) =>
                    updateDefinition(task.id, index, event.target.value)
                  }
                />
              </label>
              <button
                type="button"
                className="danger-button danger-button--subtle"
                onClick={() => removeDefinition(task.id, index)}
                disabled={task.definitions.length <= 2}
              >
                Remove
              </button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );

  const renderPromptBuilder = (task) => (
    <label>
      Prompt
      <textarea
        rows={5}
        value={task.prompt}
        onChange={(event) =>
          updateTask(task.id, { prompt: event.target.value })
        }
      />
    </label>
  );

  const renderTaskBody = (task) => {
    if (task.taskType === "vocabulary_matching") {
      return renderVocabularyBuilder(task);
    }

    if (task.taskType === "grammar_gap_fill") {
      return renderGapBuilder(task);
    }

    if (task.taskType === "correct_mistakes") {
      return renderMistakeBuilder(task);
    }

    if (
      [
        "writing_task",
        "speaking_prompt",
        "picture_comparison",
        "personal_questions",
      ].includes(task.taskType)
    ) {
      return renderPromptBuilder(task);
    }

    return renderChoiceBuilder(task);
  };

  const previewTasks = normalizeFormForRules(form).tasks.map(getTaskPayload);

  return (
    <div className="page-stack">
      <section className="card manage-tests-hero">
        <div>
          <p className="eyebrow">Test management</p>
          <h2>Build sharper assessments without wrestling the layout</h2>
          <p>
            Manage midterm and final blocks, tune question sets, and keep the
            teacher workflow clean on desktop, tablet, and phone screens.
          </p>
        </div>
        <button
          className="primary-button primary-button--with-icon"
          onClick={openCreateModal}
        >
          <FaPlus />
          <span>Create new test</span>
        </button>
      </section>

      {loading ? <p className="empty-copy">Loading tests...</p> : null}
      <ErrorAlert message={error} />

      <section className="dashboard-grid dashboard-grid--compact manage-tests-stats">
        <DashboardCard
          label="All tests"
          value={tests.length}
          helper="Stored assessment blocks"
        />
        <DashboardCard
          label="Midterm blocks"
          value={midtermCount}
          helper="Vocabulary, grammar, speaking"
          tone="info"
        />
        <DashboardCard
          label="Final blocks"
          value={finalCount}
          helper="Listening, reading, writing, speaking"
          tone="success"
        />
        <DashboardCard
          label="Question bank"
          value={totalQuestions}
          helper="Across editable tests"
          tone="info"
        />
      </section>

      <section className="card manage-tests-toolbar">
        <label className="manage-tests-search">
          <span>Search tests</span>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by title, instruction, type..."
          />
        </label>
        <label>
          Exam type
          <select
            value={examTypeFilter}
            onChange={(event) => setExamTypeFilter(event.target.value)}
          >
            <option value="all">All exam types</option>
            {EXAM_TYPE_OPTIONS.map((examType) => (
              <option key={examType} value={examType}>
                {EXAM_TYPE_LABELS[examType] || formatLabel(examType)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Section
          <select
            value={sectionFilter}
            onChange={(event) => setSectionFilter(event.target.value)}
          >
            <option value="all">All sections</option>
            {SECTION_OPTIONS.map((section) => (
              <option key={section} value={section}>
                {formatLabel(section)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="manage-tests-grid">
        {filteredTests.map((test) => (
          <article key={test.id} className="card manage-test-card">
            <div className="manage-test-card__top">
              <span
                className={`manage-test-card__type manage-test-card__type--${test.type}`}
              >
                {formatLabel(test.type)}
              </span>
              <span className="pill pill--soft">
                {EXAM_TYPE_LABELS[test.section] || formatLabel(test.section)}
              </span>
            </div>

            <div className="manage-test-card__body">
              <h3>{test.title}</h3>
              <p>{test.instructions || "No instructions yet."}</p>
            </div>

            <div className="manage-test-card__meta">
              <span>
                <FaListCheck />
                {getQuestionCount(test)} items
              </span>
              <span>
                <FaChartSimple />
                {test.score} pts
              </span>
              <span>
                <FaClock />
                {test.durationMinutes || 0} min
              </span>
              <span>
                <FaLayerGroup />
                {test.tasks?.length || 1} tasks
              </span>
            </div>

            <div className="manage-test-card__actions">
              <button
                className="secondary-button secondary-button--with-icon"
                onClick={() => openEditModal(test)}
              >
                <FaPenToSquare />
                <span>Edit</span>
              </button>
              <button
                className="danger-button danger-button--with-icon"
                onClick={() => handleDelete(test.id)}
              >
                <FaTrashCan />
                <span>Delete</span>
              </button>
            </div>
          </article>
        ))}

        {!filteredTests.length ? (
          <section className="card empty-state manage-tests-empty">
            <h3>No tests match these filters</h3>
            <p>Try clearing search or create a fresh assessment block.</p>
            <button
              className="primary-button primary-button--with-icon"
              onClick={openCreateModal}
            >
              <FaPlus />
              <span>Create new test</span>
            </button>
          </section>
        ) : null}
      </section>

      <Modal
        isOpen={isModalOpen}
        title={form.id ? "Edit test" : "Create test"}
        onClose={() => setIsModalOpen(false)}
        className="modal-card--wide"
      >
        <form className="modal-form manage-test-form" onSubmit={handleSave}>
          <section className="exam-steps exam-steps--progress">
            {["Exam type", "Section", "Task builder", "Preview"].map(
              (label, index) => {
                const step = index + 1;

                return (
                  <button
                    key={label}
                    type="button"
                    className={`exam-step ${
                      activeStep === step ? "exam-step--active" : ""
                    }`}
                    onClick={() => goToStep(step)}
                  >
                    <span className="pill pill--soft">Step {step}</span>
                    <strong>{label}</strong>
                  </button>
                );
              }
            )}
          </section>

          <ErrorAlert message={formError} />

          {activeStep === 1 ? (
            <section className="manage-test-form__section">
              <div>
                <p className="eyebrow">Step 1</p>
                <h3>Exam type</h3>
              </div>
              <div className="form-grid">
                {EXAM_TYPE_OPTIONS.map((examType) => (
                  <button
                    key={examType}
                    type="button"
                    className={
                      form.examType === examType
                        ? "primary-button"
                        : "secondary-button"
                    }
                    onClick={() => handleExamTypeChange(examType)}
                  >
                    {EXAM_TYPE_LABELS[examType] || formatLabel(examType)}
                  </button>
                ))}
              </div>
              {EXAM_TYPE_HELPER_TEXT[form.examType] ? (
                <p className="manage-test-form__hint">
                  {EXAM_TYPE_HELPER_TEXT[form.examType]}
                </p>
              ) : null}
            </section>
          ) : null}

          {activeStep === 2 ? (
            <section className="manage-test-form__section">
              <div>
                <p className="eyebrow">Step 2</p>
                <h3>Section</h3>
              </div>
              <div className="form-grid">
                {availableSections.map((section) => (
                  <button
                    key={section}
                    type="button"
                    className={
                      form.section === section
                        ? "primary-button"
                        : "secondary-button"
                    }
                    onClick={() => handleSectionChange(section)}
                  >
                    {formatLabel(section)}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {activeStep === 3 ? (
            <section className="manage-test-form__section question-builder">
              <div>
                <p className="eyebrow">Step 3</p>
                <h3>Task builder</h3>
              </div>
              <div className="form-grid">
                <label>
                  Class
                  <select
                    value={form.classId}
                    onChange={(event) =>
                      updateForm((current) => ({
                        ...current,
                        classId: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Select class</option>
                    {classes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Test title
                  <input
                    value={form.title}
                    onChange={(event) =>
                      updateForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  Score
                  <input
                    type="number"
                    min="1"
                    value={form.score}
                    onChange={(event) =>
                      updateForm((current) => ({
                        ...current,
                        score: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  Duration (minutes)
                  <input
                    type="number"
                    min="1"
                    value={form.durationMinutes}
                    onChange={(event) =>
                      updateForm((current) => ({
                        ...current,
                        durationMinutes: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="form-grid__wide">
                  Test instructions
                  <input
                    value={form.instructions}
                    onChange={(event) =>
                      updateForm((current) => ({
                        ...current,
                        instructions: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
              </div>
              {form.section === "reading" ? (
                <div className="manage-test-form__stack">
                  <label>
                    Passage title
                    <input
                      value={form.passageTitle}
                      onChange={(event) =>
                        updateForm((current) => ({
                          ...current,
                          passageTitle: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Passage text
                    <textarea
                      rows={5}
                      value={form.passage}
                      onChange={(event) =>
                        updateForm((current) => ({
                          ...current,
                          passage: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              ) : null}
              {form.section === "listening" ? (
                <label>
                  Audio URL or data URI
                  <textarea
                    rows={3}
                    value={form.audioUrl}
                    onChange={(event) =>
                      updateForm((current) => ({
                        ...current,
                        audioUrl: event.target.value,
                      }))
                    }
                  />
                </label>
              ) : null}
              <div className="question-builder__heading">
                <div>
                  <p className="eyebrow">Tasks</p>
                  <h3>
                    {form.tasks.length} task block
                    {form.tasks.length === 1 ? "" : "s"}
                  </h3>
                </div>
                <div className="card-actions">
                  <select
                    value={newTaskType}
                    onChange={(event) => setNewTaskType(event.target.value)}
                  >
                    {availableTaskTypes.map((taskType) => (
                      <option key={taskType} value={taskType}>
                        {formatLabel(taskType)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="primary-button primary-button--with-icon"
                    onClick={addTask}
                  >
                    <FaPlus />
                    <span>Add Task</span>
                  </button>
                </div>
              </div>
              {form.tasks.map((task, taskIndex) => (
                <article key={task.id} className="question-builder__card">
                  <div className="question-builder__card-header">
                    <span className="pill">
                      Task {taskIndex + 1}: {formatLabel(task.taskType)}
                    </span>
                    <button
                      type="button"
                      className="danger-button danger-button--subtle"
                      onClick={() => removeTask(task.id)}
                      disabled={form.tasks.length === 1}
                    >
                      Remove task
                    </button>
                  </div>
                  <div className="form-grid">
                    <label>
                      Task type
                      <select
                        value={task.taskType}
                        onChange={(event) =>
                          updateTask(task.id, createTask(event.target.value))
                        }
                      >
                        {availableTaskTypes.map((taskType) => (
                          <option key={taskType} value={taskType}>
                            {formatLabel(taskType)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Task title
                      <input
                        value={task.title}
                        onChange={(event) =>
                          updateTask(task.id, { title: event.target.value })
                        }
                      />
                    </label>
                    <label className="form-grid__wide">
                      Task instructions
                      <input
                        value={task.instructions}
                        onChange={(event) =>
                          updateTask(task.id, {
                            instructions: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                  {renderTaskBody(task)}
                </article>
              ))}
            </section>
          ) : null}

          {activeStep === 4 ? (
            <section className="manage-test-form__section">
              <div>
                <p className="eyebrow">Step 4</p>
                <h3>Preview + Save</h3>
              </div>
              <div className="content-action-preview__meta">
                <span>{EXAM_TYPE_LABELS[form.examType]}</span>
                <span>{formatLabel(form.section)}</span>
                <span>{form.tasks.length} tasks</span>
                <span>{form.score} pts</span>
              </div>
              <div className="prose-block">
                <h4>{form.title || "Untitled test"}</h4>
                <p>{form.instructions || "No instructions yet."}</p>
              </div>
              <div className="prose-block">
                <h4>Tasks JSON</h4>
                <pre>{JSON.stringify(previewTasks, null, 2)}</pre>
              </div>
              {currentValidationErrors.length ? (
                <p className="error-text">{currentValidationErrors[0]}</p>
              ) : (
                <p className="success-text">Ready to save.</p>
              )}
            </section>
          ) : null}

          <div className="manage-test-form__footer">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            {activeStep > 1 ? (
              <button
                className="secondary-button"
                type="button"
                onClick={() => goToStep(activeStep - 1)}
              >
                Back
              </button>
            ) : null}
            {activeStep < 4 ? (
              <button
                className="primary-button"
                type="button"
                onClick={() => goToStep(activeStep + 1)}
              >
                Next
              </button>
            ) : (
              <button
                className="primary-button primary-button--with-icon"
                type="submit"
                disabled={saving}
              >
                <FaPlus />
                <span>
                  {saving
                    ? "Saving..."
                    : form.id
                    ? "Save changes"
                    : "Create test"}
                </span>
              </button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default TeacherManageTestsPage;
