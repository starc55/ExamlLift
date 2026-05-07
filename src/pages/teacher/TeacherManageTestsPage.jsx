import { useMemo, useState } from "react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import Modal from "../../components/layout/Modal";
import TestCard from "../../components/cards/TestCard";
import {
  createTest,
  deleteTest,
  getAllTests,
  updateTest,
} from "../../services/tests/testService";

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
  const [tests, setTests] = useState(() => getAllTests());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(createEmptyForm());

  const isQuestionBased = useMemo(
    () => !["writing", "speaking"].includes(form.type),
    [form.type]
  );
  const midtermCount = tests.filter((test) => test.section === "midterm").length;
  const finalCount = tests.filter((test) => test.section === "final").length;

  const refreshTests = () => setTests(getAllTests());

  const openCreateModal = () => {
    setForm(createEmptyForm());
    setIsModalOpen(true);
  };

  const openEditModal = (test) => {
    setForm({
      ...test,
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

  const handleSave = (event) => {
    event.preventDefault();

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

    if (form.id) {
      updateTest(form.id, payload);
    } else {
      createTest(payload);
    }

    refreshTests();
    setIsModalOpen(false);
  };

  const handleDelete = (testId) => {
    deleteTest(testId);
    refreshTests();
  };

  return (
    <div className="page-stack">
      <section className="section-heading section-heading--with-tools">
        <div>
          <p className="eyebrow">Test management</p>
          <h2>Create, edit, and delete assessment blocks</h2>
        </div>
        <button className="primary-button" onClick={openCreateModal}>
          Create new test
        </button>
      </section>

      <section className="dashboard-grid dashboard-grid--compact">
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
      </section>

      <section className="dashboard-grid dashboard-grid--features">
        {tests.map((test) => (
          <TestCard
            key={test.id}
            title={test.title}
            description={test.instructions}
            stats={`${test.type} • ${test.section}`}
          >
            <div className="card-actions">
              <span className="pill pill--soft">
                {test.questions?.length || 0} questions • {test.score} pts
              </span>
              <div className="card-actions">
                <button className="secondary-button" onClick={() => openEditModal(test)}>
                  Edit
                </button>
                <button className="danger-button" onClick={() => handleDelete(test.id)}>
                  Delete
                </button>
              </div>
            </div>
          </TestCard>
        ))}
      </section>

      <Modal
        isOpen={isModalOpen}
        title={form.id ? "Edit test" : "Create test"}
        onClose={() => setIsModalOpen(false)}
      >
        <form className="modal-form" onSubmit={handleSave}>
          <div className="form-grid">
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
                <option value="vocabulary">Vocabulary</option>
                <option value="grammar">Grammar</option>
                <option value="reading">Reading</option>
                <option value="listening">Listening</option>
                <option value="writing">Writing</option>
                <option value="speaking">Speaking</option>
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
                <option value="midterm">Midterm</option>
                <option value="final">Final</option>
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

          {form.type === "reading" ? (
            <>
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
            </>
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

          {isQuestionBased ? (
            <div className="question-builder">
              {form.questions.map((question, questionIndex) => (
                <div key={question.id} className="question-builder__card">
                  <label>
                    Question {questionIndex + 1}
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
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    questions: [...current.questions, createEmptyQuestion()],
                  }))
                }
              >
                Add question
              </button>
            </div>
          ) : null}

          <button className="primary-button" type="submit">
            {form.id ? "Save changes" : "Create test"}
          </button>
        </form>
      </Modal>
    </div>
  );
}

export default TeacherManageTestsPage;
