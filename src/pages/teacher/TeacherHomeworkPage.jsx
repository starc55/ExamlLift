import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardCard from "../../components/dashboard/DashboardCard";
import TestCard from "../../components/cards/TestCard";
import ErrorAlert from "../../components/feedback/ErrorAlert";
import { useAuth } from "../../context/AuthContext";
import { getTeacherClasses } from "../../services/classes/classService";
import {
  createHomework,
  getTeacherHomeworks,
  uploadHomeworkFile,
} from "../../services/homework/homeworkService";
import { useSafeAsyncEffect } from "../../hooks/useSafeAsyncEffect";

const initialForm = {
  title: "",
  classId: "",
  instructions: "",
  type: "writing_homework",
  level: "Intermediate",
  deadline: "",
  correctAnswersText: "",
};

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
      const correctAnswers = form.correctAnswersText.trim()
        ? JSON.parse(form.correctAnswersText)
        : null;

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
              <option value="writing_homework">writing_homework</option>
              <option value="speaking_homework">speaking_homework</option>
              <option value="grammar_homework">grammar_homework</option>
              <option value="vocabulary_homework">vocabulary_homework</option>
              <option value="reading_homework">reading_homework</option>
              <option value="listening_homework">listening_homework</option>
              <option value="file_homework">file_homework</option>
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
          {statusMessage ? (
            <p className="success-text">{statusMessage}</p>
          ) : null}
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
          </TestCard>
        ))}
      </section>
    </div>
  );
}

export default TeacherHomeworkPage;
