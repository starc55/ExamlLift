import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardCard from "../../components/dashboard/DashboardCard";
import ErrorAlert from "../../components/feedback/ErrorAlert";
import TestCard from "../../components/cards/TestCard";
import { useAuth } from "../../context/AuthContext";
import {
  createClass,
  deleteClass,
  getTeacherClasses,
} from "../../services/classes/classService";

const initialForm = {
  title: "",
  description: "",
};

function TeacherClassesPage() {
  const { currentUser } = useAuth();
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadClasses = async () => {
    setLoading(true);
    setError("");

    try {
      setClasses(await getTeacherClasses());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const nextClass = await createClass({
        ...form,
        teacherId: currentUser.id,
      });
      setClasses((current) => [nextClass, ...current]);
      setForm(initialForm);
      setMessage(`Class created. Invite code: ${nextClass.inviteCode}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async (inviteCode) => {
    await navigator.clipboard.writeText(inviteCode);
    setMessage(`Invite code copied: ${inviteCode}`);
  };

  const handleDelete = async (classId) => {
    const confirmed = window.confirm("Delete this class and its related data?");

    if (!confirmed) {
      return;
    }

    try {
      await deleteClass(classId);
      setClasses((current) => current.filter((item) => item.id !== classId));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="page-stack">
      <section className="dashboard-grid dashboard-grid--compact">
        <DashboardCard label="Classes" value={classes.length} helper="Teacher-owned groups" />
        <DashboardCard
          label="Students"
          value={classes.reduce((total, item) => total + item.studentCount, 0)}
          helper="Joined with invite code"
          tone="info"
        />
        <DashboardCard label="Auth mode" value="Supabase" helper="RLS protected" tone="success" />
      </section>

      <TestCard
        title="Create class"
        description="Students join with the generated invite code."
        stats="IELTS-XXXXX"
      >
        <form className="assignment-form" onSubmit={handleSubmit}>
          <label>
            Title
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="IELTS Group A"
              required
            />
          </label>
          <label>
            Description
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Short class description"
            />
          </label>
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create class"}
          </button>
        </form>
      </TestCard>

      <ErrorAlert message={error} />
      {message ? <p className="success-text">{message}</p> : null}

      <section className="section-heading">
        <div>
          <p className="eyebrow">Class management</p>
          <h2>Your Supabase classes</h2>
        </div>
      </section>

      {loading ? <p className="empty-copy">Loading classes...</p> : null}

      <section className="dashboard-grid dashboard-grid--features">
        {!loading && !classes.length ? (
          <section className="card empty-state">
            <h3>No classes yet</h3>
            <p>Create your first class to unlock content, tests, homework, and results.</p>
          </section>
        ) : null}
        {classes.map((item) => (
          <TestCard
            key={item.id}
            title={item.title}
            description={item.description || "No description yet."}
            stats={`${item.studentCount} students`}
          >
            <div className="content-card__meta">
              <span>{item.inviteCode}</span>
              <span>{new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
            <button
              className="secondary-button card-link"
              type="button"
              onClick={() => handleCopy(item.inviteCode)}
            >
              Copy invite code
            </button>
            <Link to={`/teacher/classes/${item.id}`} className="primary-button card-link">
              Open class
            </Link>
            <button
              className="danger-button card-link"
              type="button"
              onClick={() => handleDelete(item.id)}
            >
              Delete
            </button>
          </TestCard>
        ))}
      </section>
    </div>
  );
}

export default TeacherClassesPage;
