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
  multiple_choice: "TASK 1 - MULTIPLE CHOICE. Choose the correct answer.",
  grammar_gap_fill:
    "TASK 2 - GAP FILL. Complete the sentences using the correct form of the verbs in brackets.",
  choose_correct_form: "TASK 3 - Choose the correct answer.",
  vocabulary_matching:
    "TASK 4 - MATCHING. Match the words (1-10) with the correct definitions (a-j).",
  correct_mistakes:
    "TASK 5 - CORRECT THE MISTAKES. Rewrite the sentences correctly.",
  writing_task: "Writing task",
  speaking_prompt: "Speaking prompt",
  picture_comparison: "Picture comparison",
  personal_questions: "Personal questions",
  true_false_not_given: "True / False / Not Given",
  matching: "Matching",
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

function createDefaultDefinitions(count = 10) {
  return Array.from({ length: count }, (_, index) => createDefinition(index));
}

function createDefaultWords(count = 10) {
  return Array.from({ length: count }, (_, index) => createMatchingWord(index));
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

function createEmptyForm(classId = "") {
  const section = "vocabulary";
  const taskType = getDefaultTaskType(section);

  return {
    id: null,
    classId,
    title: "",
    examType: "midterm",
    section,
    taskType,
    taskTitle: TASK_TITLE_BY_TYPE[taskType],
    instructions: "",
    durationMinutes: 10,
    score: 10,
    prompt: "",
    passageTitle: "",
    passage: "",
    audioUrl: "",
    questions: createQuestionsForTask(taskType),
    words: createDefaultWords(),
    definitions: createDefaultDefinitions(),
  };
}

function normalizeFormForRules(form) {
  const allowedSections = getAllowedSections(form.examType);
  const section = allowedSections.includes(form.section)
    ? form.section
    : allowedSections[0];
  const allowedTaskTypes = getAllowedTaskTypes(section);
  const taskType = allowedTaskTypes.includes(form.taskType)
    ? form.taskType
    : allowedTaskTypes[0];
  const didTaskChange = taskType !== form.taskType;

  return {
    ...form,
    section,
    taskType,
    taskTitle:
      didTaskChange || !form.taskTitle
        ? TASK_TITLE_BY_TYPE[taskType]
        : form.taskTitle,
    questions: didTaskChange
      ? createQuestionsForTask(taskType)
      : form.questions?.length
      ? form.questions
      : createQuestionsForTask(taskType),
    words: form.words?.length ? form.words : createDefaultWords(),
    definitions: form.definitions?.length
      ? form.definitions
      : createDefaultDefinitions(),
  };
}

function getTaskFromTest(test) {
  return test.tasks?.[0] || null;
}

function getQuestionCount(test) {
  const task = getTaskFromTest(test);

  if (task?.taskType === "vocabulary_matching") {
    return task.words?.length || test.matchingData?.words?.length || 0;
  }

  return task?.questions?.length || test.questions?.length || 0;
}

function taskToEditableQuestions(task, fallbackQuestions = []) {
  const taskType = task?.taskType || "multiple_choice";
  const questions = task?.questions?.length
    ? task.questions
    : fallbackQuestions;

  if (taskType === "grammar_gap_fill") {
    return questions.length
      ? questions.map((question) => ({
          id: question.id || createId("gap"),
          sentence: question.sentence || question.prompt || "",
          baseWord: question.baseWord || "",
          correctAnswer: question.correctAnswer || "",
        }))
      : [createGapQuestion()];
  }

  if (taskType === "correct_mistakes") {
    return questions.length
      ? questions.map((question) => ({
          id: question.id || createId("mistake"),
          incorrectSentence:
            question.incorrectSentence || question.prompt || "",
          correctAnswer: question.correctAnswer || "",
        }))
      : [createMistakeQuestion()];
  }

  return questions.length
    ? questions.map((question) => ({
        id: question.id || createId("question"),
        prompt: question.prompt || question.sentence || "",
        sentence: question.sentence || question.prompt || "",
        options: normalizeOptions(
          question.options,
          taskType === "choose_correct_form" ? 2 : 4
        ),
        correctAnswer: question.correctAnswer || "",
      }))
    : createQuestionsForTask(taskType);
}

function testToForm(test) {
  const section = test.type || test.section || "vocabulary";
  const task = getTaskFromTest(test);
  const taskType =
    task?.taskType ||
    test.taskType ||
    test.questionType ||
    getDefaultTaskType(section);
  const matchingData =
    task?.taskType === "vocabulary_matching" ? task : test.matchingData;

  return normalizeFormForRules({
    ...createEmptyForm(test.classId || ""),
    id: test.id,
    classId: test.classId || "",
    title: test.title || "",
    examType: test.examType || test.section || "practice",
    section,
    taskType,
    taskTitle: task?.title || test.taskTitle || TASK_TITLE_BY_TYPE[taskType],
    instructions: test.instructions || "",
    durationMinutes: test.durationMinutes || 10,
    score: test.score || 10,
    prompt: task?.prompt || test.prompt || "",
    passageTitle: test.passageTitle || "",
    passage: test.passage || "",
    audioUrl: test.audioUrl || "",
    questions: taskToEditableQuestions(task, test.questions),
    words: matchingData?.words?.length
      ? matchingData.words.map((word, index) => ({
          id: word.id || index + 1,
          term: word.term || "",
          correctAnswer: word.correctAnswer || word.correct || "",
        }))
      : createDefaultWords(),
    definitions: matchingData?.definitions?.length
      ? matchingData.definitions.map((definition, index) => ({
          key: definition.key || DEFINITION_KEYS[index] || String(index + 1),
          text: definition.text || "",
        }))
      : createDefaultDefinitions(),
  });
}

function questionLabel(taskType) {
  if (taskType === "grammar_gap_fill") return "Sentence with blank";
  if (taskType === "choose_correct_form") return "Sentence";
  return "Question";
}

function getTaskPayload(form) {
  const baseTask = {
    taskType: form.taskType,
    title: form.taskTitle || TASK_TITLE_BY_TYPE[form.taskType],
  };

  if (form.taskType === "vocabulary_matching") {
    return {
      ...baseTask,
      words: form.words.map((word, index) => ({
        id: word.id || index + 1,
        term: word.term.trim(),
        correctAnswer: word.correctAnswer,
      })),
      definitions: form.definitions.map((definition, index) => ({
        key: definition.key || DEFINITION_KEYS[index] || String(index + 1),
        text: definition.text.trim(),
      })),
    };
  }

  if (form.taskType === "grammar_gap_fill") {
    return {
      ...baseTask,
      questions: form.questions.map((question, index) => ({
        id: question.id || index + 1,
        sentence: question.sentence.trim(),
        baseWord: question.baseWord.trim(),
        correctAnswer: question.correctAnswer.trim(),
      })),
    };
  }

  if (form.taskType === "correct_mistakes") {
    return {
      ...baseTask,
      questions: form.questions.map((question, index) => ({
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
    ].includes(form.taskType)
  ) {
    return {
      ...baseTask,
      prompt: form.prompt.trim(),
      questions: [],
    };
  }

  return {
    ...baseTask,
    questions: form.questions.map((question, index) => ({
      id: question.id || index + 1,
      prompt: (form.taskType === "choose_correct_form"
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

function validateForm(form) {
  const errors = [];
  const task = getTaskPayload(form);

  if (!form.title.trim()) errors.push("Title required.");
  if (!form.examType) errors.push("Exam type required.");
  if (!form.section) errors.push("Section required.");
  if (!form.taskType) errors.push("Task type required.");

  if (!getAllowedSections(form.examType).includes(form.section)) {
    errors.push("Selected section bu exam type uchun ruxsat etilmagan.");
  }

  if (!getAllowedTaskTypes(form.section).includes(form.taskType)) {
    errors.push("Selected task type bu section uchun ruxsat etilmagan.");
  }

  if (form.taskType === "vocabulary_matching") {
    if (task.words.length < 2 || task.definitions.length < 2) {
      errors.push(
        "Vocabulary matching uchun kamida 2 ta word va definition kerak."
      );
    }

    if (task.words.length !== task.definitions.length) {
      errors.push("Words va definitions soni teng bo'lishi kerak.");
    }

    if (task.words.some((word) => !word.term || !word.correctAnswer)) {
      errors.push("Har bir word uchun term va correct mapping majburiy.");
    }

    if (task.definitions.some((definition) => !definition.text)) {
      errors.push("Har bir definition matni majburiy.");
    }

    return errors;
  }

  if (
    [
      "writing_task",
      "speaking_prompt",
      "picture_comparison",
      "personal_questions",
    ].includes(form.taskType)
  ) {
    if (!task.prompt) errors.push("Prompt required.");
    return errors;
  }

  if (!task.questions?.length) {
    errors.push("At least 1 question required.");
  }

  task.questions.forEach((question, index) => {
    if (form.taskType === "grammar_gap_fill") {
      if (!question.sentence || !question.correctAnswer) {
        errors.push(
          `Question ${index + 1}: sentence and correct answer required.`
        );
      }
      return;
    }

    if (form.taskType === "correct_mistakes") {
      if (!question.incorrectSentence || !question.correctAnswer) {
        errors.push(
          `Question ${
            index + 1
          }: incorrect sentence and correct answer required.`
        );
      }
      return;
    }

    const optionCount = question.options.filter((option) => option.text).length;
    const optionKeys = question.options.map((option) => option.key);

    if (!question.prompt) {
      errors.push(`Question ${index + 1}: question/sentence required.`);
    }

    if (optionCount < 2) {
      errors.push(`Question ${index + 1}: minimum 2 options required.`);
    }

    if (!question.correctAnswer) {
      errors.push(`Question ${index + 1}: correct answer required.`);
    } else if (!optionKeys.includes(question.correctAnswer)) {
      errors.push(`Question ${index + 1}: correct answer must match an option.`);
    }
  });

  return errors;
}

function buildPayload(form) {
  const task = getTaskPayload(form);
  const questions = task.questions || [];
  const matchingData =
    task.taskType === "vocabulary_matching"
      ? {
          title: task.title,
          instruction: form.instructions,
          words: task.words.map((word) => ({
            id: word.id,
            term: word.term,
            correct: word.correctAnswer,
            correctAnswer: word.correctAnswer,
          })),
          definitions: task.definitions,
        }
      : null;

  return {
    id: form.id,
    classId: form.classId,
    title: form.title,
    examType: form.examType,
    section: form.examType,
    type: form.section,
    taskType: form.taskType,
    questionType: form.taskType,
    taskTitle: task.title,
    instructions: form.instructions,
    durationMinutes: form.durationMinutes,
    score: form.score,
    prompt: task.prompt || form.prompt,
    passageTitle: form.passageTitle,
    passage: form.passage,
    audioUrl: form.audioUrl,
    tasks: [task],
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
  const selectedTaskTitle =
    form.taskTitle ||
    TASK_TITLE_BY_TYPE[form.taskType] ||
    formatLabel(form.taskType);
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
      const searchableValues = [
        test.title,
        test.instructions,
        test.type,
        test.section,
        test.examType,
        getTaskFromTest(test)?.taskType,
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
    setForm(createEmptyForm(classes[0]?.id || ""));
    setActiveStep(1);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (test) => {
    setForm(testToForm(test));
    setActiveStep(1);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleExamTypeChange = (examType) => {
    updateForm((current) => ({
      ...current,
      examType,
    }));
  };

  const handleSectionChange = (section) => {
    const taskType = getDefaultTaskType(section);
    updateForm((current) => ({
      ...current,
      section,
      taskType,
      taskTitle: TASK_TITLE_BY_TYPE[taskType],
      questions: createQuestionsForTask(taskType),
    }));
  };

  const handleTaskTypeChange = (taskType) => {
    updateForm((current) => ({
      ...current,
      taskType,
      taskTitle: TASK_TITLE_BY_TYPE[taskType],
      questions: createQuestionsForTask(taskType),
    }));
  };

  const updateQuestion = (questionId, patch) => {
    updateForm((current) => ({
      ...current,
      questions: current.questions.map((question) =>
        question.id === questionId ? { ...question, ...patch } : question
      ),
    }));
  };

  const updateOption = (questionId, optionIndex, text) => {
    updateForm((current) => ({
      ...current,
      questions: current.questions.map((question) => {
        if (question.id !== questionId) return question;

        const options = question.options.map((option, index) =>
          index === optionIndex ? { ...option, text } : option
        );

        return { ...question, options };
      }),
    }));
  };

  const addQuestion = () => {
    updateForm((current) => ({
      ...current,
      questions: [
        ...current.questions,
        createQuestionsForTask(current.taskType)[0],
      ],
    }));
  };

  const removeQuestion = (questionId) => {
    updateForm((current) => ({
      ...current,
      questions:
        current.questions.length > 1
          ? current.questions.filter((question) => question.id !== questionId)
          : current.questions,
    }));
  };

  const addOption = (questionId) => {
    updateForm((current) => ({
      ...current,
      questions: current.questions.map((question) => {
        if (question.id !== questionId) return question;

        return {
          ...question,
          options: [...question.options, createOption(question.options.length)],
        };
      }),
    }));
  };

  const removeOption = (questionId, optionIndex) => {
    updateForm((current) => ({
      ...current,
      questions: current.questions.map((question) => {
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
      }),
    }));
  };

  const updateWord = (index, patch) => {
    updateForm((current) => ({
      ...current,
      words: current.words.map((word, wordIndex) =>
        wordIndex === index ? { ...word, ...patch } : word
      ),
    }));
  };

  const addWord = () => {
    updateForm((current) => ({
      ...current,
      words: [...current.words, createMatchingWord(current.words.length)],
    }));
  };

  const removeWord = (index) => {
    updateForm((current) => ({
      ...current,
      words:
        current.words.length > 2
          ? current.words.filter((_, wordIndex) => wordIndex !== index)
          : current.words,
    }));
  };

  const updateDefinition = (index, text) => {
    updateForm((current) => ({
      ...current,
      definitions: current.definitions.map((definition, definitionIndex) =>
        definitionIndex === index ? { ...definition, text } : definition
      ),
    }));
  };

  const addDefinition = () => {
    updateForm((current) => ({
      ...current,
      definitions: [
        ...current.definitions,
        createDefinition(current.definitions.length),
      ],
    }));
  };

  const removeDefinition = (index) => {
    updateForm((current) => {
      if (current.definitions.length <= 2) return current;

      const removedKey = current.definitions[index]?.key;
      const definitions = current.definitions
        .filter((_, definitionIndex) => definitionIndex !== index)
        .map((definition, definitionIndex) => ({
          ...definition,
          key: DEFINITION_KEYS[definitionIndex] || String(definitionIndex + 1),
        }));

      return {
        ...current,
        definitions,
        words: current.words.map((word) => ({
          ...word,
          correctAnswer:
            word.correctAnswer === removedKey ? "" : word.correctAnswer,
        })),
      };
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
      setActiveStep(5);
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

  const renderChoiceBuilder = () => (
    <div className="manage-test-form__stack">
      {form.questions.map((question, questionIndex) => (
        <div key={question.id} className="question-builder__card">
          <div className="question-builder__card-header">
            <span className="pill pill--soft">
              Question {questionIndex + 1}
            </span>
            <button
              type="button"
              className="danger-button danger-button--subtle"
              onClick={() => removeQuestion(question.id)}
              disabled={form.questions.length === 1}
            >
              Remove
            </button>
          </div>
          <label>
            {questionLabel(form.taskType)}
            <input
              value={
                form.taskType === "choose_correct_form"
                  ? question.sentence
                  : question.prompt
              }
              onChange={(event) =>
                updateQuestion(
                  question.id,
                  form.taskType === "choose_correct_form"
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
              placeholder={questionLabel(form.taskType)}
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
                      updateOption(question.id, optionIndex, event.target.value)
                    }
                    placeholder={`Option ${option.key}`}
                  />
                </label>
                <button
                  type="button"
                  className="danger-button danger-button--subtle"
                  onClick={() => removeOption(question.id, optionIndex)}
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
            onClick={() => addOption(question.id)}
          >
            Add option
          </button>
          <label>
            Correct answer
            <select
              value={question.correctAnswer}
              onChange={(event) =>
                updateQuestion(question.id, {
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
        onClick={addQuestion}
      >
        <FaPlus />
        <span>Add question</span>
      </button>
    </div>
  );

  const renderGapBuilder = () => (
    <div className="manage-test-form__stack">
      {form.questions.map((question, index) => (
        <div key={question.id} className="question-builder__card">
          <div className="question-builder__card-header">
            <span className="pill pill--soft">Sentence {index + 1}</span>
            <button
              type="button"
              className="danger-button danger-button--subtle"
              onClick={() => removeQuestion(question.id)}
              disabled={form.questions.length === 1}
            >
              Remove
            </button>
          </div>
          <label>
            Sentence with blank
            <input
              value={question.sentence}
              onChange={(event) =>
                updateQuestion(question.id, { sentence: event.target.value })
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
                  updateQuestion(question.id, { baseWord: event.target.value })
                }
                placeholder="be"
              />
            </label>
            <label>
              Correct answer
              <input
                value={question.correctAnswer}
                onChange={(event) =>
                  updateQuestion(question.id, {
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
        onClick={addQuestion}
      >
        <FaPlus />
        <span>Add sentence</span>
      </button>
    </div>
  );

  const renderMistakeBuilder = () => (
    <div className="manage-test-form__stack">
      {form.questions.map((question, index) => (
        <div key={question.id} className="question-builder__card">
          <div className="question-builder__card-header">
            <span className="pill pill--soft">Sentence {index + 1}</span>
            <button
              type="button"
              className="danger-button danger-button--subtle"
              onClick={() => removeQuestion(question.id)}
              disabled={form.questions.length === 1}
            >
              Remove
            </button>
          </div>
          <label>
            Incorrect sentence
            <input
              value={question.incorrectSentence}
              onChange={(event) =>
                updateQuestion(question.id, {
                  incorrectSentence: event.target.value,
                })
              }
              placeholder="She don't believe..."
            />
          </label>
          <label>
            Correct answer
            <input
              value={question.correctAnswer}
              onChange={(event) =>
                updateQuestion(question.id, {
                  correctAnswer: event.target.value,
                })
              }
              placeholder="She doesn't believe..."
            />
          </label>
        </div>
      ))}
      <button
        type="button"
        className="secondary-button secondary-button--with-icon card-link"
        onClick={addQuestion}
      >
        <FaPlus />
        <span>Add sentence</span>
      </button>
    </div>
  );

  const renderVocabularyBuilder = () => (
    <div className="manage-test-form__stack">
      <div className="question-builder__heading">
        <div>
          <p className="eyebrow">Vocabulary matching</p>
          <h3>Words and definitions</h3>
        </div>
        <div className="card-actions">
          <button type="button" className="secondary-button" onClick={addWord}>
            Add word
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={addDefinition}
          >
            Add definition
          </button>
        </div>
      </div>
      <div className="form-grid">
        <section className="question-builder__card">
          <h4>Words</h4>
          {form.words.map((word, index) => (
            <div
              key={`${word.id}-${index}`}
              className="question-builder__option-row"
            >
              <label>
                {index + 1}. Word
                <input
                  value={word.term}
                  onChange={(event) =>
                    updateWord(index, { term: event.target.value })
                  }
                  placeholder="volunteer"
                />
              </label>
              <label>
                Correct definition
                <select
                  value={word.correctAnswer}
                  onChange={(event) =>
                    updateWord(index, { correctAnswer: event.target.value })
                  }
                >
                  <option value="">Select</option>
                  {form.definitions.map((definition) => (
                    <option key={definition.key} value={definition.key}>
                      {definition.key}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="danger-button danger-button--subtle"
                onClick={() => removeWord(index)}
                disabled={form.words.length <= 2}
              >
                Remove
              </button>
            </div>
          ))}
        </section>
        <section className="question-builder__card">
          <h4>Definitions</h4>
          {form.definitions.map((definition, index) => (
            <div key={definition.key} className="question-builder__option-row">
              <label>
                Definition {definition.key}
                <input
                  value={definition.text}
                  onChange={(event) =>
                    updateDefinition(index, event.target.value)
                  }
                  placeholder="a person who works without payment"
                />
              </label>
              <button
                type="button"
                className="danger-button danger-button--subtle"
                onClick={() => removeDefinition(index)}
                disabled={form.definitions.length <= 2}
              >
                Remove
              </button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );

  const renderPromptBuilder = () => (
    <label>
      Prompt
      <textarea
        rows={5}
        value={form.prompt}
        onChange={(event) =>
          updateForm((current) => ({ ...current, prompt: event.target.value }))
        }
        placeholder="Task prompt"
      />
    </label>
  );

  const renderTaskBuilder = () => {
    if (form.taskType === "vocabulary_matching")
      return renderVocabularyBuilder();
    if (form.taskType === "grammar_gap_fill") return renderGapBuilder();
    if (form.taskType === "correct_mistakes") return renderMistakeBuilder();
    if (
      [
        "writing_task",
        "speaking_prompt",
        "picture_comparison",
        "personal_questions",
      ].includes(form.taskType)
    ) {
      return renderPromptBuilder();
    }

    return renderChoiceBuilder();
  };

  const previewTask = getTaskPayload(normalizeFormForRules(form));

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
        {filteredTests.map((test) => {
          const task = getTaskFromTest(test);

          return (
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
                  {task?.taskType ? formatLabel(task.taskType) : "Task open"}
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
          );
        })}

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
            {[
              "Exam type",
              "Section",
              "Question type",
              "Task builder",
              "Preview",
            ].map((label, index) => {
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
            })}
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
            <section className="manage-test-form__section">
              <div>
                <p className="eyebrow">Step 3</p>
                <h3>Question type</h3>
              </div>
              <div className="form-grid">
                {availableTaskTypes.map((taskType) => (
                  <button
                    key={taskType}
                    type="button"
                    className={
                      form.taskType === taskType
                        ? "primary-button"
                        : "secondary-button"
                    }
                    onClick={() => handleTaskTypeChange(taskType)}
                  >
                    {formatLabel(taskType)}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {activeStep === 4 ? (
            <section className="manage-test-form__section question-builder">
              <div>
                <p className="eyebrow">Step 4</p>
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
                  Title
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
                  Task title
                  <input
                    value={form.taskTitle}
                    onChange={(event) =>
                      updateForm((current) => ({
                        ...current,
                        taskTitle: event.target.value,
                      }))
                    }
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
                  Instructions
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
                    placeholder="Paste uploaded audio URL or data URI"
                  />
                </label>
              ) : null}
              {renderTaskBuilder()}
            </section>
          ) : null}

          {activeStep === 5 ? (
            <section className="manage-test-form__section">
              <div>
                <p className="eyebrow">Step 5</p>
                <h3>Preview + Save</h3>
              </div>
              <div className="content-action-preview__meta">
                <span>{EXAM_TYPE_LABELS[form.examType]}</span>
                <span>{formatLabel(form.section)}</span>
                <span>{formatLabel(form.taskType)}</span>
                <span>{form.score} pts</span>
              </div>
              <div className="prose-block">
                <h4>{form.title || "Untitled test"}</h4>
                <p>{form.instructions || "No instructions yet."}</p>
              </div>
              <div className="prose-block">
                <h4>{selectedTaskTitle}</h4>
                <pre>{JSON.stringify(previewTask, null, 2)}</pre>
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
            {activeStep < 5 ? (
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
