import { Link } from "react-router-dom";
import DashboardCard from "../../components/dashboard/DashboardCard";
import TestCard from "../../components/cards/TestCard";
import { useAuth } from "../../context/AuthContext";
import { getAssignmentsForTeacher } from "../../services/content/assignmentService";
import { getAllContent } from "../../services/content/contentService";
import { getAllResults } from "../../services/results/resultService";
import { getAllTests } from "../../services/tests/testService";

function TeacherDashboardPage() {
  const { currentUser } = useAuth();
  const contentCount = getAllContent().length;
  const tests = getAllTests();
  const results = getAllResults();
  const assignments = getAssignmentsForTeacher(currentUser.id);
  const averagePercent = results.length
    ? Math.round(results.reduce((total, item) => total + item.percent, 0) / results.length)
    : 0;
  const pendingAssignments = assignments.filter(
    (assignment) => assignment.status === "pending"
  );

  return (
    <div className="page-stack">
      <section className="hero-card hero-card--blue">
        <div>
          <p className="eyebrow">Teacher workspace</p>
          <h3>Content, tasks, tests, and results in one compact teacher panel</h3>
          <p>
            Use the teacher panel to upload lessons, approve student assignments,
            manage tests, and review performance results.
          </p>
          <div className="hero-card__actions">
            <Link to="/teacher/upload-content" className="primary-button">
              Upload lesson
            </Link>
            <Link to="/teacher/results" className="secondary-button">
              Open results
            </Link>
          </div>
        </div>
        <div className="hero-card__stats">
          <DashboardCard label="Content items" value={contentCount} helper="Seed + uploaded lessons" />
          <DashboardCard label="Managed tests" value={tests.length} helper="All assessment blocks" tone="info" />
          <DashboardCard label="Average score" value={`${averagePercent}%`} helper="Across saved attempts" tone="success" />
        </div>
      </section>

      <section className="dashboard-grid dashboard-grid--compact">
        <DashboardCard label="Pending tasks" value={pendingAssignments.length} helper="Waiting for teacher approval" tone="info" />
        <DashboardCard label="Accepted tasks" value={assignments.length - pendingAssignments.length} helper="Already reviewed uploads" tone="success" />
        <DashboardCard label="Saved results" value={results.length} helper="Student submissions in storage" />
      </section>

      <section className="dashboard-grid dashboard-grid--features">
        <TestCard
          title="Upload pipeline"
          description="Lesson metadata, assignment brief, media and compact preview cards."
          stats="Content + task flow"
        >
          <Link to="/teacher/upload-content" className="primary-button card-link">
            Open upload
          </Link>
        </TestCard>
        <TestCard
          title="Test management"
          description="A compact CRUD workspace for midterm and final sections."
          stats="Responsive builder"
        >
          <Link to="/teacher/manage-tests" className="secondary-button card-link">
            Manage tests
          </Link>
        </TestCard>
        <TestCard
          title="Assignment review"
          description="Review and approve homework files submitted by students."
          stats={`${pendingAssignments.length} pending`}
        >
          <Link to="/teacher/upload-content" className="secondary-button card-link">
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
                    <p>{assignment.contentTitle}</p>
                  </div>
                  <span className="pill pill--soft">Pending</span>
                </div>
                <p className="assignment-item__task">{assignment.taskTitle}</p>
                <p>{assignment.note || "No note attached."}</p>
              </article>
            ))
          ) : (
            <div className="empty-state">
              <h3>No pending tasks</h3>
              <p>New student homework uploads will appear here automatically.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default TeacherDashboardPage;
