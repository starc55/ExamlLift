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

const SECTION_OPTIONS = [
  "vocabulary",
  "grammar",
  "reading",
  "listening",
  "writing",
  "speaking",
];
const EXAM_TYPE_OPTIONS = ["midterm", "final", "practice", "homework"];

const SECTION_OPTIONS_BY_EXAM_TYPE = {
  final: ["reading", "speaking", "listening", "writing"],
  midterm: ["vocabulary", "grammar", "speaking"],
  practice: SECTION_OPTIONS,
  homework: SECTION_OPTIONS,
};

const EXAM_TYPE_HELPER_TEXT = {
  final:
    "Final exam faqat Reading, Listening, Writing va Speaking sectionlaridan iborat.",
  midterm:
    "Midterm faqat Vocabulary, Grammar va Speaking sectionlaridan iborat.",
};

const QUESTION_TYPES_BY_SECTION = {
  vocabulary: ["matching_definitions", "gap_fill_vocabulary"],
  grammar: [
    "multiple_choice",
    "gap_fill_grammar",
    "choose_correct_option",
    "matching_grammar",
    "correct_mistakes",
  ],
  speaking: ["speaking_prompt", "picture_comparison", "personal_questions"],
  writing: ["writing_task"],
  reading: ["multiple_choice", "true_false_not_given", "matching"],
  listening: ["multiple_choice"],
};

const QUESTION_TYPE_HELPER_TEXT = {
  matching_definitions:
    "Column A uchun word kiriting, optionlarda Column B definitions yozing.",
  gap_fill_vocabulary:
    "Prompt sentence ichida blank bo'ladi, options esa word bank sifatida ishlaydi.",
  gap_fill_grammar:
    "Prompt gap-fill grammar savoli, options grammatik javob variantlari.",
  matching_grammar:
    "Prompt grammar item, options esa matching qilinadigan grammar choices.",
  correct_mistakes:
    "Prompt ichida xato gap yoziladi, correct answer to'g'ri variant bo'ladi.",
  writing_task: "Writing uchun bitta prompt saqlanadi.",
  speaking_prompt: "Speaking uchun asosiy prompt saqlanadi.",
  picture_comparison:
    "Speaking prompt rasm solishtirish vazifasi sifatida saqlanadi.",
  personal_questions: "Speaking prompt personal questions sifatida saqlanadi.",
};

function formatLabel(value) {
  return String(value)
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getAllowedSections(examType) {
  return SECTION_OPTIONS_BY_EXAM_TYPE[examType] || SECTION_OPTIONS;
}

function getAllowedQuestionTypes(section) {
  return QUESTION_TYPES_BY_SECTION[section] || ["multiple_choice"];
}

function getDefaultQuestionType(section) {
  return getAllowedQuestionTypes(section)[0];
}

function getPromptFieldLabel(questionType) {
  if (questionType === "matching_definitions") {
    return "Column A word";
  }

  if (
    questionType === "gap_fill_vocabulary" ||
    questionType === "gap_fill_grammar"
  ) {
    return "Sentence with blank";
  }

  if (questionType === "correct_mistakes") {
    return "Sentence with mistake";
  }

  return "Prompt";
}

function getOptionFieldLabel(questionType, optionIndex) {
  const optionNumber = optionIndex + 1;

  if (questionType === "matching_definitions") {
    return `Column B definition ${optionNumber}`;
  }

  if (questionType === "gap_fill_vocabulary") {
    return `Word bank item ${optionNumber}`;
  }

  if (questionType === "gap_fill_grammar") {
    return `Grammar option ${optionNumber}`;
  }

  return `Option ${optionNumber}`;
}

function getCorrectAnswerLabel(questionType) {
  if (questionType === "matching_definitions") {
    return "Matching definition";
  }

  if (questionType === "correct_mistakes") {
    return "Correct version";
  }

  return "Correct answer";
}

function normalizeFormForRules(nextForm) {
  const allowedSections = getAllowedSections(nextForm.section);
  const safeSection = allowedSections.includes(nextForm.type)
    ? nextForm.type
    : allowedSections[0];
  const allowedQuestionTypes = getAllowedQuestionTypes(safeSection);
  const safeQuestionType = allowedQuestionTypes.includes(nextForm.questionType)
    ? nextForm.questionType
    : allowedQuestionTypes[0];

  return {
    ...nextForm,
    type: safeSection,
    examType: nextForm.section,
    questionType: safeQuestionType,
  };
}

function createEmptyQuestion() {
  return {
    id: `question-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    prompt: "",
    options: ["", "", "", ""],
    correctAnswer: "",
  };
}

function createEmptyForm() {
  return {
    id: null,
    classId: "",
    title: "",
    type: "vocabulary",
    section: "midterm",
    questionType: getDefaultQuestionType("vocabulary"),
    instructions: "",
    durationMinutes: 10,
    score: 10,
    prompt: "",
    passageTitle: "",
    passage: "",
    audioUrl: "",
    questions: [createEmptyQuestion()],
  };
}

function TeacherManageTestsPage() {
  const [tests, setTests] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(createEmptyForm());
  const [searchTerm, setSearchTerm] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isQuestionBased = useMemo(
    () => !["writing", "speaking"].includes(form.type),
    [form.type]
  );
  const availableSections = useMemo(
    () => getAllowedSections(form.section),
    [form.section]
  );
  const availableQuestionTypes = useMemo(
    () => getAllowedQuestionTypes(form.type),
    [form.type]
  );
  const examTypeHelperText = EXAM_TYPE_HELPER_TEXT[form.section] || "";
  const questionTypeHelperText =
    QUESTION_TYPE_HELPER_TEXT[form.questionType] || "";
  const midtermCount = tests.filter((test) => test.section === "midterm").length;
  const finalCount = tests.filter((test) => test.section === "final").length;
  const totalQuestions = tests.reduce(
    (total, test) => total + (test.questions?.length || 0),
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
        test.level,
      ];
      const matchesSearch =
        !normalizedSearch ||
        searchableValues
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));
      const matchesSection =
        sectionFilter === "all" || test.section === sectionFilter;
      const matchesType = typeFilter === "all" || test.type === typeFilter;

      return matchesSearch && matchesSection && matchesType;
    });
  }, [sectionFilter, searchTerm, tests, typeFilter]);

  useSafeAsyncEffect("teacher-manage-tests", async ({ safeSet }) => {
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
  }, []);

  const openCreateModal = () => {
    setForm(
      normalizeFormForRules({
        ...createEmptyForm(),
        classId: classes[0]?.id || "",
      })
    );
    setIsModalOpen(true);
  };

  const openEditModal = (test) => {
    setForm(
      normalizeFormForRules({
        ...test,
        classId: test.classId || "",
        questionType: test.questionType || getDefaultQuestionType(test.type),
        questions: test.questions?.length ? test.questions : [createEmptyQuestion()],
      })
    );
    setIsModalOpen(true);
  };

  const handleExamTypeChange = (examType) => {
    setForm((current) =>
      normalizeFormForRules({
        ...current,
        section: examType,
      })
    );
  };

  const handleSectionChange = (section) => {
    setForm((current) =>
      normalizeFormForRules({
        ...current,
        type: section,
        questionType: getDefaultQuestionType(section),
      })
    );
  };

  const handleQuestionTypeChange = (questionType) => {
    setForm((current) =>
      normalizeFormForRules({
        ...current,
        questionType,
      })
    );
  };

  const handleQuestionChange = (questionId, field, value) => {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question) =>
        question.id === questionId ? { ...question, [field]: value } : question
      ),
    }));
  };

  const handleOptionChange = (questionId, optionIndex, value) => {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question) => {
        if (question.id !== questionId) {
          return question;
        }

        const nextOptions = [...question.options];
        nextOptions[optionIndex] = value;
        return { ...question, options: nextOptions };
      }),
    }));
  };

  const handleRemoveQuestion = (questionId) => {
    setForm((current) => ({
      ...current,
      questions:
        current.questions.length > 1
          ? current.questions.filter((question) => question.id !== questionId)
          : current.questions,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const normalizedForm = normalizeFormForRules(form);
    const shouldSaveQuestions = !["writing", "speaking"].includes(
      normalizedForm.type
    );
    const payload = {
      ...normalizedForm,
      questions: shouldSaveQuestions
        ? normalizedForm.questions
            .filter(
              (question) =>
                question.prompt.trim() &&
                question.options.every((option) => option.trim()) &&
                question.correctAnswer
            )
            .map((question) => ({
              ...question,
              questionType: normalizedForm.questionType,
            }))
        : [],
    };

    try {
      if (!payload.classId) {
        throw new Error("Avval class tanlang.");
      }

      if (!getAllowedSections(payload.section).includes(payload.type)) {
        throw new Error("Selected section bu exam type uchun ruxsat etilmagan.");
      }

      if (!getAllowedQuestionTypes(payload.type).includes(payload.questionType)) {
        throw new Error("Selected question type bu section uchun ruxsat etilmagan.");
      }

      if (shouldSaveQuestions && !payload.questions.length) {
        throw new Error("Kamida bitta to'liq question kiriting.");
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
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (testId) => {
    const confirmed = window.confirm("Delete this test block? This cannot be undone.");

    if (!confirmed) {
      return;
    }

    try {
      await deleteTest(testId);
      setTests((current) => current.filter((item) => item.id !== testId));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

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
        <button className="primary-button primary-button--with-icon" onClick={openCreateModal}>
          <FaPlus />
          <span>Create new test</span>
        </button>
      </section>

      {loading ? <p className="empty-copy">Loading tests...</p> : null}
      <ErrorAlert message={error} />

      <section className="dashboard-grid dashboard-grid--compact manage-tests-stats">
        <DashboardCard label="All tests" value={tests.length} helper="Stored assessment blocks" />
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
          helper="Across editable objective tests"
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
            value={sectionFilter}
            onChange={(event) => setSectionFilter(event.target.value)}
          >
            <option value="all">All exam types</option>
            {EXAM_TYPE_OPTIONS.map((section) => (
              <option key={section} value={section}>
                {formatLabel(section)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Section
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="all">All sections</option>
            {SECTION_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {formatLabel(type)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="manage-tests-grid">
        {filteredTests.map((test) => (
          <article key={test.id} className="card manage-test-card">
            <div className="manage-test-card__top">
              <span className={`manage-test-card__type manage-test-card__type--${test.type}`}>
                {formatLabel(test.type)}
              </span>
              <span className="pill pill--soft">{formatLabel(test.section)}</span>
            </div>

            <div className="manage-test-card__body">
              <h3>{test.title}</h3>
              <p>{test.instructions || "No instructions yet."}</p>
            </div>

            <div className="manage-test-card__meta">
              <span>
                <FaListCheck />
                {test.questions?.length || 0} questions
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
                {test.level || "Level open"}
              </span>
            </div>

            <div className="manage-test-card__actions">
              <button className="secondary-button secondary-button--with-icon" onClick={() => openEditModal(test)}>
                <FaPenToSquare />
                <span>Edit</span>
              </button>
              <button className="danger-button danger-button--with-icon" onClick={() => handleDelete(test.id)}>
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
            <button className="primary-button primary-button--with-icon" onClick={openCreateModal}>
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
          <section className="manage-test-form__section">
            <div>
              <p className="eyebrow">Core settings</p>
              <h3>Assessment identity</h3>
            </div>
            <div className="form-grid">
              <label>
                Exam Type
                <select
                  value={form.section}
                  onChange={(event) => handleExamTypeChange(event.target.value)}
                >
                  {EXAM_TYPE_OPTIONS.map((examType) => (
                    <option key={examType} value={examType}>
                      {formatLabel(examType)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Section
                <select
                  value={form.type}
                  onChange={(event) => handleSectionChange(event.target.value)}
                >
                  {availableSections.map((section) => (
                    <option key={section} value={section}>
                      {formatLabel(section)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Question Type
                <select
                  value={form.questionType}
                  onChange={(event) => handleQuestionTypeChange(event.target.value)}
                >
                  {availableQuestionTypes.map((questionType) => (
                    <option key={questionType} value={questionType}>
                      {formatLabel(questionType)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Class
                <select
                  value={form.classId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, classId: event.target.value }))
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
                    setForm((current) => ({ ...current, title: event.target.value }))
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
                    setForm((current) => ({ ...current, score: event.target.value }))
                  }
                  required
                />
              </label>
            </div>
            {examTypeHelperText ? (
              <p className="manage-test-form__hint">{examTypeHelperText}</p>
            ) : null}
            {questionTypeHelperText ? (
              <p className="manage-test-form__hint">{questionTypeHelperText}</p>
            ) : null}
          </section>

          <section className="manage-test-form__section">
            <div>
              <p className="eyebrow">Delivery</p>
              <h3>Timing and instructions</h3>
            </div>
            <div className="form-grid">
              <label>
                Duration (minutes)
                <input
                  type="number"
                  min="1"
                  value={form.durationMinutes}
                  onChange={(event) =>
                    setForm((current) => ({
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
                    setForm((current) => ({
                      ...current,
                      instructions: event.target.value,
                    }))
                  }
                  required
                />
              </label>
            </div>
          </section>

          <section className="manage-test-form__section">
            <div>
              <p className="eyebrow">Content setup</p>
              <h3>{isQuestionBased ? "Source material" : "Prompt"}</h3>
            </div>

            {form.type === "reading" ? (
              <div className="manage-test-form__stack">
                <label>
                  Passage title
                  <input
                    value={form.passageTitle}
                    onChange={(event) =>
                      setForm((current) => ({
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
                      setForm((current) => ({ ...current, passage: event.target.value }))
                    }
                  />
                </label>
              </div>
            ) : null}

            {form.type === "listening" ? (
              <label>
                Audio URL or data URI
                <textarea
                  rows={3}
                  value={form.audioUrl}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, audioUrl: event.target.value }))
                  }
                  placeholder="Paste uploaded audio URL or data URI"
                />
              </label>
            ) : null}

            {!isQuestionBased ? (
              <label>
                Prompt
                <textarea
                  rows={5}
                  value={form.prompt}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, prompt: event.target.value }))
                  }
                  placeholder="Task prompt"
                />
              </label>
            ) : null}

            {isQuestionBased && !["reading", "listening"].includes(form.type) ? (
              <p className="manage-test-form__hint">
                Add direct question prompts below. Reading and listening can also
                include passage or audio context above.
              </p>
            ) : null}
          </section>

          {isQuestionBased ? (
            <section className="manage-test-form__section question-builder">
              <div className="question-builder__heading">
                <div>
                  <p className="eyebrow">Question builder</p>
                  <h3>
                    {form.questions.length} editable item
                    {form.questions.length === 1 ? "" : "s"}
                  </h3>
                </div>
                <button
                  type="button"
                  className="secondary-button secondary-button--with-icon"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      questions: [...current.questions, createEmptyQuestion()],
                    }))
                  }
                >
                  <FaPlus />
                  <span>Add question</span>
                </button>
              </div>

              {form.questions.map((question, questionIndex) => (
                <div key={question.id} className="question-builder__card">
                  <div className="question-builder__card-header">
                    <span className="pill pill--soft">Question {questionIndex + 1}</span>
                    <button
                      type="button"
                      className="danger-button danger-button--subtle"
                      onClick={() => handleRemoveQuestion(question.id)}
                      disabled={form.questions.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                  <label>
                    {getPromptFieldLabel(form.questionType)}
                    <input
                      value={question.prompt}
                      onChange={(event) =>
                        handleQuestionChange(question.id, "prompt", event.target.value)
                      }
                      placeholder={getPromptFieldLabel(form.questionType)}
                    />
                  </label>
                  <div className="form-grid">
                    {question.options.map((option, optionIndex) => (
                      <label key={`${question.id}-${optionIndex}`}>
                        {getOptionFieldLabel(form.questionType, optionIndex)}
                        <input
                          value={option}
                          onChange={(event) =>
                            handleOptionChange(question.id, optionIndex, event.target.value)
                          }
                          placeholder={getOptionFieldLabel(form.questionType, optionIndex)}
                        />
                      </label>
                    ))}
                  </div>
                  <label>
                    {getCorrectAnswerLabel(form.questionType)}
                    <select
                      value={question.correctAnswer}
                      onChange={(event) =>
                        handleQuestionChange(
                          question.id,
                          "correctAnswer",
                          event.target.value
                        )
                      }
                    >
                      <option value="">Select correct answer</option>
                      {question.options.map((option, optionIndex) => (
                        <option key={`${option}-${optionIndex}`} value={option}>
                          {option || `Option ${optionIndex + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ))}
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
            <button className="primary-button primary-button--with-icon" type="submit" disabled={saving}>
              <FaPlus />
              <span>{saving ? "Saving..." : form.id ? "Save changes" : "Create test"}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default TeacherManageTestsPage;
