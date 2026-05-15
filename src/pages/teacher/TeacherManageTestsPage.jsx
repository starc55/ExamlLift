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

const TEST_TYPES = ["vocabulary", "grammar", "reading", "listening", "writing", "speaking"];
const TEST_SECTIONS = ["midterm", "final", "practice"];

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
    setForm({ ...createEmptyForm(), classId: classes[0]?.id || "" });
    setIsModalOpen(true);
  };

  const openEditModal = (test) => {
    setForm({
      ...test,
      classId: test.classId || "",
      questions: test.questions?.length ? test.questions : [createEmptyQuestion()],
    });
    setIsModalOpen(true);
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

    const payload = {
      ...form,
      questions: isQuestionBased
        ? form.questions.filter(
            (question) =>
              question.prompt.trim() &&
              question.options.every((option) => option.trim()) &&
              question.correctAnswer
          )
        : [],
    };

    try {
      if (!payload.classId) {
        throw new Error("Avval class tanlang.");
      }

      const savedTest = form.id
        ? await updateTest(form.id, payload)
        : await createTest(payload);

      setTests((current) =>
        form.id
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
          Section
          <select
            value={sectionFilter}
            onChange={(event) => setSectionFilter(event.target.value)}
          >
            <option value="all">All sections</option>
            {TEST_SECTIONS.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="all">All types</option>
            {TEST_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
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
                {test.type}
              </span>
              <span className="pill pill--soft">{test.section}</span>
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
                Type
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, type: event.target.value }))
                  }
                >
                  {TEST_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Section
                <select
                  value={form.section}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, section: event.target.value }))
                  }
                >
                  {TEST_SECTIONS.map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
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
                    Prompt
                    <input
                      value={question.prompt}
                      onChange={(event) =>
                        handleQuestionChange(question.id, "prompt", event.target.value)
                      }
                      placeholder="Question prompt"
                    />
                  </label>
                  <div className="form-grid">
                    {question.options.map((option, optionIndex) => (
                      <label key={`${question.id}-${optionIndex}`}>
                        Option {optionIndex + 1}
                        <input
                          value={option}
                          onChange={(event) =>
                            handleOptionChange(question.id, optionIndex, event.target.value)
                          }
                          placeholder={`Option ${optionIndex + 1}`}
                        />
                      </label>
                    ))}
                  </div>
                  <label>
                    Correct answer
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
