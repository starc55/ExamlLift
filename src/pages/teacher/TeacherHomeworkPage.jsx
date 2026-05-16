import { useState } from "react";
import {
  FaEllipsisVertical,
  FaEye,
  FaPenToSquare,
  FaTrashCan,
} from "react-icons/fa6";
import { Link } from "react-router-dom";
import DashboardCard from "../../components/dashboard/DashboardCard";
import TestCard from "../../components/cards/TestCard";
import ErrorAlert from "../../components/feedback/ErrorAlert";
import Modal from "../../components/layout/Modal";
import { useAuth } from "../../context/AuthContext";
import { getTeacherClasses } from "../../services/classes/classService";
import {
  createHomework,
  deleteHomework,
  getTeacherHomeworks,
  updateHomework,
  uploadHomeworkFile,
} from "../../services/homework/homeworkService";
import { useSafeAsyncEffect } from "../../hooks/useSafeAsyncEffect";

const homeworkTypeOptions = [
  "writing_homework",
  "speaking_homework",
  "grammar_homework",
  "vocabulary_homework",
  "reading_homework",
  "listening_homework",
  "file_homework",
];

const initialForm = {
  title: "",
  classId: "",
  instructions: "",
  type: "writing_homework",
  level: "Intermediate",
  deadline: "",
  correctAnswersText: "",
  attachmentName: "",
  attachmentUrl: "",
};

function parseCorrectAnswers(value) {
  const trimmedValue = value.trim();

  return trimmedValue ? JSON.parse(trimmedValue) : null;
}

function homeworkToForm(homework) {
  return {
    title: homework.title || "",
    classId: homework.classId || "",
    instructions: homework.instructions || "",
    type: homework.type || "writing_homework",
    level: homework.level || "Intermediate",
    deadline: homework.deadline || "",
    correctAnswersText: homework.correctAnswers
      ? JSON.stringify(homework.correctAnswers, null, 2)
      : "",
    attachmentName: homework.attachmentName || "",
    attachmentUrl: homework.attachmentUrl || "",
  };
}

function TeacherHomeworkPage() {
  const { currentUser } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [classes, setClasses] = useState([]);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [homeworkItems, setHomeworkItems] = useState([]);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [editingHomework, setEditingHomework] = useState(null);
  const [deletingHomework, setDeletingHomework] = useState(null);
  const [editForm, setEditForm] = useState(initialForm);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useSafeAsyncEffect(
    "teacher-homework",
    async ({ safeSet }) => {
      safeSet(() => {
        setPageLoading(true);
        setError("");
      });

      try {
        const [nextClasses, nextHomework] = await Promise.all([
          getTeacherClasses(),
          getTeacherHomeworks(),
        ]);

        safeSet(() => {
          setClasses(nextClasses);
          setHomeworkItems(nextHomework);
          setForm((current) => ({
            ...current,
            classId: current.classId || nextClasses[0]?.id || "",
          }));
        });
      } catch (requestError) {
        safeSet(() => {
          setError(requestError.message);
        });
      } finally {
        safeSet(() => {
          setPageLoading(false);
        });
      }
    },
    []
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setStatusMessage("");

    try {
      if (!form.classId) {
        throw new Error("Avval class tanlang.");
      }

      const attachmentUrl = await uploadHomeworkFile(
        file,
        "homework-attachments"
      );
      const correctAnswers = parseCorrectAnswers(form.correctAnswersText);

      const createdHomework = await createHomework({
        title: form.title,
        classId: form.classId,
        instructions: form.instructions,
        type: form.type,
        level: form.level,
        deadline: form.deadline,
        attachmentName: fileName,
        attachmentUrl,
        correctAnswers,
        teacherId: currentUser.id,
      });

      setHomeworkItems((current) => [createdHomework, ...current]);
      setForm({ ...initialForm, classId: classes[0]?.id || "" });
      setFile(null);
      setFileName("");
      setStatusMessage("Homework Supabasega saqlandi.");
    } catch (requestError) {
      setError(
        requestError.message ||
          "Correct answers JSON noto'g'ri yoki faylni yuklashda xatolik bor."
      );
    } finally {
      setLoading(false);
    }
  };

  const openEditHomework = (homework) => {
    setError("");
    setStatusMessage("");
    setEditingHomework(homework);
    setEditForm(homeworkToForm(homework));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    setIsEditing(true);
    setError("");
    setStatusMessage("");

    try {
      const correctAnswers = parseCorrectAnswers(editForm.correctAnswersText);
      const updatedHomework = await updateHomework(editingHomework.id, {
        title: editForm.title,
        classId: editForm.classId,
        instructions: editForm.instructions,
        type: editForm.type,
        level: editForm.level,
        deadline: editForm.deadline,
        attachmentName: editForm.attachmentName,
        attachmentUrl: editForm.attachmentUrl,
        correctAnswers,
      });

      setHomeworkItems((current) =>
        current.map((item) =>
          item.id === updatedHomework.id ? updatedHomework : item
        )
      );
      setEditingHomework(null);
      setStatusMessage("Homework updated.");
    } catch (requestError) {
      setError(
        requestError.message ||
          "Correct answers JSON noto'g'ri yoki homeworkni yangilashda xatolik bor."
      );
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteHomework = async () => {
    setIsDeleting(true);
    setError("");
    setStatusMessage("");

    try {
      await deleteHomework(deletingHomework.id);
      setHomeworkItems((current) =>
        current.filter((item) => item.id !== deletingHomework.id)
      );
      setDeletingHomework(null);
      setStatusMessage("Homework deleted.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="page-stack">
      <section className="dashboard-grid dashboard-grid--compact">
        <DashboardCard
          label="Homework tasks"
          value={homeworkItems.length}
          helper="Teacher-created tasks"
        />
        <DashboardCard
          label="Objective types"
          value={homeworkItems.filter((item) => item.correctAnswers).length}
          helper="Local + AI blend"
          tone="info"
        />
        <DashboardCard
          label="AI-enabled types"
          value={
            homeworkItems.filter((item) => item.type !== "file_homework").length
          }
          helper="Submit with AI support"
          tone="success"
        />
      </section>

      {pageLoading ? <p className="empty-copy">Loading homework...</p> : null}
      <ErrorAlert message={error} />
      {statusMessage ? <p className="success-text">{statusMessage}</p> : null}

      <TestCard
        title="Create homework"
        description="Add class, deadline, type, optional attachment, and optional correct answers JSON."
        stats="Supabase database workflow"
      >
        <form className="assignment-form" onSubmit={handleSubmit}>
          <label>
            Class
            <select
              value={form.classId}
              onChange={(event) =>
                setForm((current) => ({
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
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              required
            />
          </label>
          <label>
            Instructions
            <textarea
              rows={5}
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
          <label>
            Type
            <select
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({ ...current, type: event.target.value }))
              }
            >
              {homeworkTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Level
            <input
              value={form.level}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  level: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Deadline
            <input
              type="date"
              value={form.deadline}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  deadline: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Correct answers JSON (optional)
            <textarea
              rows={5}
              value={form.correctAnswersText}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  correctAnswersText: event.target.value,
                }))
              }
              placeholder='{"items":[{"id":"1","prompt":"Question 1","correctAnswer":"answer"}]}'
            />
          </label>
          <div className="file-field">
            <span>Attachment (optional)</span>
            <input
              className="file-field__input"
              id="teacher-homework-file"
              type="file"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] || null;
                setFile(nextFile);
                setFileName(nextFile?.name || "");
              }}
            />
            <div className="file-field__row">
              <label
                htmlFor="teacher-homework-file"
                className="file-field__trigger"
              >
                Choose file
              </label>
              <strong className="file-field__name">
                {fileName || "No file selected"}
              </strong>
            </div>
          </div>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Create homework"}
          </button>
        </form>
      </TestCard>

      <section className="section-heading section-heading--with-tools">
        <div>
          <p className="eyebrow">Homework library</p>
          <h2>Current homework tasks</h2>
        </div>
        <Link
          to="/teacher/homework/submissions"
          className="secondary-button card-link"
        >
          Open submissions
        </Link>
      </section>

      <section className="dashboard-grid dashboard-grid--features">
        {!pageLoading && !homeworkItems.length ? (
          <section className="card empty-state">
            <h3>No homework yet</h3>
            <p>Create the first homework for one of your classes.</p>
          </section>
        ) : null}
        {homeworkItems.map((homework) => (
          <TestCard
            key={homework.id}
            title={homework.title}
            description={homework.instructions}
            stats={`${homework.type} | Due ${homework.deadline || "-"}`}
          >
            <div className="content-card__meta">
              <span>{homework.level}</span>
              <span>{homework.createdByName}</span>
            </div>
            <div className="teacher-homework-card__footer">
              <div>
                <span className="pill pill--soft">
                  {homework.correctAnswers ? "Objective" : "AI checked"}
                </span>
                {homework.attachmentUrl ? (
                  <span className="pill pill--soft">Attachment</span>
                ) : null}
              </div>
              <details className="action-menu">
                <summary aria-label={`${homework.title} actions`}>
                  <FaEllipsisVertical />
                  <span>Actions</span>
                </summary>
                <div className="action-menu__list">
                  <button
                    type="button"
                    onClick={() => setSelectedHomework(homework)}
                  >
                    <FaEye />
                    <span>View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditHomework(homework)}
                  >
                    <FaPenToSquare />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingHomework(homework)}
                  >
                    <FaTrashCan />
                    <span>Delete</span>
                  </button>
                </div>
              </details>
            </div>
          </TestCard>
        ))}
      </section>

      <Modal
        isOpen={Boolean(selectedHomework)}
        title={selectedHomework?.title || "Homework preview"}
        onClose={() => setSelectedHomework(null)}
        className="modal-card--wide"
      >
        {selectedHomework ? (
          <div className="modal-card__content">
            <p>{selectedHomework.instructions}</p>
            <div className="content-action-preview__meta">
              <span>{selectedHomework.type}</span>
              <span>{selectedHomework.level}</span>
              <span>Due {selectedHomework.deadline || "-"}</span>
              <span>{selectedHomework.createdByName}</span>
            </div>
            {selectedHomework.attachmentUrl ? (
              <div className="assignment-ai-summary">
                <strong>Attachment</strong>
                <p>{selectedHomework.attachmentName || "Homework file"}</p>
                <a
                  className="text-link"
                  href={selectedHomework.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open attachment
                </a>
              </div>
            ) : null}
            {selectedHomework.correctAnswers ? (
              <div className="prose-block">
                <h4>Correct answers</h4>
                <pre>{JSON.stringify(selectedHomework.correctAnswers, null, 2)}</pre>
              </div>
            ) : null}
            <div className="card-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setSelectedHomework(null)}
              >
                Close
              </button>
              <Link
                to="/teacher/homework/submissions"
                className="primary-button card-link"
              >
                Open submissions
              </Link>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={Boolean(editingHomework)}
        title="Edit homework"
        onClose={() => setEditingHomework(null)}
        className="modal-card--wide"
      >
        <form className="modal-form" onSubmit={handleEditSubmit}>
          <div className="form-grid">
            <label>
              Class
              <select
                value={editForm.classId}
                onChange={(event) =>
                  setEditForm((current) => ({
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
                value={editForm.title}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label>
              Type
              <select
                value={editForm.type}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    type: event.target.value,
                  }))
                }
              >
                {homeworkTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Level
              <input
                value={editForm.level}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    level: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Deadline
              <input
                type="date"
                value={editForm.deadline}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    deadline: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <label>
            Instructions
            <textarea
              rows={5}
              value={editForm.instructions}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  instructions: event.target.value,
                }))
              }
              required
            />
          </label>
          <div className="form-grid">
            <label>
              Attachment name
              <input
                value={editForm.attachmentName}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    attachmentName: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Attachment URL
              <input
                value={editForm.attachmentUrl}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    attachmentUrl: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <label>
            Correct answers JSON (optional)
            <textarea
              rows={5}
              value={editForm.correctAnswersText}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  correctAnswersText: event.target.value,
                }))
              }
              placeholder='{"items":[{"id":"1","prompt":"Question 1","correctAnswer":"answer"}]}'
            />
          </label>
          <div className="manage-test-form__footer">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setEditingHomework(null)}
            >
              Cancel
            </button>
            <button className="primary-button" type="submit" disabled={isEditing}>
              {isEditing ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(deletingHomework)}
        title="Delete homework?"
        onClose={() => setDeletingHomework(null)}
      >
        <div className="modal-card__content">
          <p>
            {deletingHomework?.title} homeworkini o'chirishni tasdiqlaysizmi?
            Bog'langan submissions ham o'chiriladi.
          </p>
          <div className="card-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setDeletingHomework(null)}
            >
              Cancel
            </button>
            <button
              className="danger-button"
              type="button"
              onClick={handleDeleteHomework}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default TeacherHomeworkPage;
