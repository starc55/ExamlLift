import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardCard from "../../components/dashboard/DashboardCard";
import TestCard from "../../components/cards/TestCard";
import ErrorAlert from "../../components/feedback/ErrorAlert";
import { useAuth } from "../../context/AuthContext";
import { createHomework, getAllHomework } from "../../services/homework/homeworkService";
import { fileToDataUrl } from "../../utils/fileHelpers";

const initialForm = {
  title: "",
  instructions: "",
  type: "writing_homework",
  level: "Intermediate",
  deadline: "",
  correctAnswersText: "",
};

function TeacherHomeworkPage() {
  const { currentUser } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [homeworkItems, setHomeworkItems] = useState(() => getAllHomework());

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setStatusMessage("");

    try {
      const attachmentUrl = await fileToDataUrl(file);
      const correctAnswers = form.correctAnswersText.trim()
        ? JSON.parse(form.correctAnswersText)
        : null;

      createHomework({
        title: form.title,
        instructions: form.instructions,
        type: form.type,
        level: form.level,
        deadline: form.deadline,
        attachmentName: fileName,
        attachmentUrl,
        correctAnswers,
        createdBy: currentUser.id,
        createdByName: currentUser.fullname,
      });

      setHomeworkItems(getAllHomework());
      setForm(initialForm);
      setFile(null);
      setFileName("");
      setStatusMessage("Homework muvaffaqiyatli yaratildi.");
    } catch (requestError) {
      setError("Correct answers JSON noto'g'ri yoki faylni o'qishda xatolik bor.");
      console.error(requestError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <section className="dashboard-grid dashboard-grid--compact">
        <DashboardCard label="Homework tasks" value={homeworkItems.length} helper="Teacher-created tasks" />
        <DashboardCard label="Objective types" value={homeworkItems.filter((item) => item.correctAnswers).length} helper="Local + AI blend" tone="info" />
        <DashboardCard label="AI-enabled types" value={homeworkItems.filter((item) => item.type !== "file_homework").length} helper="Submit with AI support" tone="success" />
      </section>

      <TestCard
        title="Create homework"
        description="Add deadline, type, optional attachment, and optional correct answers JSON."
        stats="Production-style local storage workflow"
      >
        <form className="assignment-form" onSubmit={handleSubmit}>
          <label>
            Title
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label>
            Instructions
            <textarea
              rows={5}
              value={form.instructions}
              onChange={(event) =>
                setForm((current) => ({ ...current, instructions: event.target.value }))
              }
            />
          </label>
          <label>
            Type
            <select
              value={form.type}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
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
              onChange={(event) => setForm((current) => ({ ...current, level: event.target.value }))}
            />
          </label>
          <label>
            Deadline
            <input
              type="date"
              value={form.deadline}
              onChange={(event) => setForm((current) => ({ ...current, deadline: event.target.value }))}
            />
          </label>
          <label>
            Correct answers JSON (optional)
            <textarea
              rows={5}
              value={form.correctAnswersText}
              onChange={(event) =>
                setForm((current) => ({ ...current, correctAnswersText: event.target.value }))
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
              <label htmlFor="teacher-homework-file" className="file-field__trigger">
                Choose file
              </label>
              <strong className="file-field__name">{fileName || "No file selected"}</strong>
            </div>
          </div>
          <ErrorAlert message={error} />
          {statusMessage ? <p className="success-text">{statusMessage}</p> : null}
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
        <Link to="/teacher/homework/submissions" className="secondary-button card-link">
          Open submissions
        </Link>
      </section>

      <section className="dashboard-grid dashboard-grid--features">
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
