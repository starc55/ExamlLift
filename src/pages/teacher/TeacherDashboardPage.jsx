import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardCard from "../../components/dashboard/DashboardCard";
import ErrorAlert from "../../components/feedback/ErrorAlert";
import TestCard from "../../components/cards/TestCard";
import { getTeacherClasses } from "../../services/classes/classService";
import { getContentList } from "../../services/content/contentService";
import { getAllHomeworkSubmissions } from "../../services/homework/homeworkService";
import { getAllResults } from "../../services/results/resultService";
import { getTeacherTests } from "../../services/tests/testService";

function TeacherDashboardPage() {
  const [classes, setClasses] = useState([]);
  const [contentCount, setContentCount] = useState(0);
  const [tests, setTests] = useState([]);
  const [results, setResults] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const [nextClasses, nextContent, nextTests, nextResults, nextAssignments] =
          await Promise.all([
            getTeacherClasses(),
            getContentList(),
            getTeacherTests(),
            getAllResults(),
            getAllHomeworkSubmissions(),
          ]);

        if (!isMounted) {
          return;
        }

        setClasses(nextClasses);
        setContentCount(nextContent.length);
        setTests(nextTests);
        setResults(nextResults);
        setAssignments(nextAssignments);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const averagePercent = results.length
    ? Math.round(
        results.reduce((total, item) => total + (item.percentage || item.percent), 0) /
          results.length
      )
    : 0;
  const pendingAssignments = assignments.filter(
    (assignment) => assignment.status === "submitted"
  );

  return (
    <div className="page-stack">
      <section className="hero-card hero-card--blue">
        <div>
          <p className="eyebrow">Teacher workspace</p>
          <h3>Classes, content, tasks, tests, and results in one teacher panel</h3>
          <p>
            Create invite-code classes, upload lessons, create homework, manage
            tests, and review performance results.
          </p>
          <div className="hero-card__actions">
            <Link to="/teacher/classes" className="primary-button">
              Manage classes
            </Link>
            <Link to="/teacher/upload-content" className="secondary-button">
              Upload lesson
            </Link>
            <Link to="/teacher/results" className="secondary-button">
              Open results
            </Link>
          </div>
        </div>
        <div className="hero-card__stats">
          <DashboardCard label="Classes" value={classes.length} helper="Invite-code groups" />
          <DashboardCard label="Content items" value={contentCount} helper="Published lessons" tone="info" />
          <DashboardCard label="Average score" value={`${averagePercent}%`} helper="Across saved attempts" tone="success" />
        </div>
      </section>

      {loading ? <p className="empty-copy">Loading teacher dashboard...</p> : null}
      <ErrorAlert message={error} />

      <section className="dashboard-grid dashboard-grid--compact">
        <DashboardCard label="Review queue" value={pendingAssignments.length} helper="Submitted homework to inspect" tone="info" />
        <DashboardCard label="Homework total" value={assignments.length} helper="All homework submissions" tone="success" />
        <DashboardCard label="Managed tests" value={tests.length} helper="Class assessment blocks" />
      </section>

      <section className="dashboard-grid dashboard-grid--features">
        <TestCard
          title="Class management"
          description="Create classes and share invite codes with students."
          stats={`${classes.length} classes`}
        >
          <Link to="/teacher/classes" className="primary-button card-link">
            Open classes
          </Link>
        </TestCard>
        <TestCard
          title="Upload pipeline"
          description="Lesson metadata, media files, and class-scoped publishing."
          stats="Supabase Storage"
        >
          <Link to="/teacher/upload-content" className="primary-button card-link">
            Open upload
          </Link>
        </TestCard>
        <TestCard
          title="Test management"
          description="CRUD workspace for class midterm, final, and practice tests."
          stats="Database builder"
        >
          <Link to="/teacher/manage-tests" className="secondary-button card-link">
            Manage tests
          </Link>
        </TestCard>
        <TestCard
          title="Homework review"
          description="Inspect AI feedback, transcripts, and student homework files."
          stats={`${pendingAssignments.length} pending`}
        >
          <Link to="/teacher/homework/submissions" className="secondary-button card-link">
            Review tasks
          </Link>
        </TestCard>
      </section>

      <section className="card assignment-review">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Priority queue</p>
            <h2>Pending homework submissions</h2>
          </div>
        </div>
        <div className="assignment-list">
          {pendingAssignments.length ? (
            pendingAssignments.slice(0, 4).map((assignment) => (
              <article key={assignment.id} className="assignment-item">
                <div className="assignment-item__top">
                  <div>
                    <strong>{assignment.studentName}</strong>
                    <p>{assignment.title}</p>
                  </div>
                  <span className="pill pill--soft">Submitted</span>
                </div>
                <p className="assignment-item__task">{assignment.homeworkType}</p>
                <p>{assignment.answer || assignment.transcript || "No text note attached."}</p>
                {assignment.feedback ? (
                  <div className="assignment-ai-summary">
                    <strong>AI feedback</strong>
                    <p>{assignment.feedback.split("\n")[1] || assignment.feedback}</p>
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className="empty-state">
              <h3>No submissions yet</h3>
              <p>New student homework uploads will appear here automatically.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default TeacherDashboardPage;
