import { Link } from "react-router-dom";
import DashboardCard from "../../components/dashboard/DashboardCard";
import TestCard from "../../components/cards/TestCard";
import { useAuth } from "../../context/AuthContext";
import { getAllContent } from "../../services/content/contentService";
import { getAllHomeworkSubmissions } from "../../services/homework/homeworkService";
import { getAllResults } from "../../services/results/resultService";
import { getAllTests } from "../../services/tests/testService";

function TeacherDashboardPage() {
  const { currentUser } = useAuth();
  const contentCount = getAllContent().length;
  const tests = getAllTests();
  const results = getAllResults();
  const assignments = getAllHomeworkSubmissions().filter(
    (submission) => submission.teacherId === currentUser.id
  );
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
          <h3>Content, tasks, tests, and results in one compact teacher panel</h3>
          <p>
            Use the teacher panel to upload lessons, create homework,
            manage tests, and review performance results.
          </p>
          <div className="hero-card__actions">
            <Link to="/teacher/upload-content" className="primary-button">
              Upload lesson
            </Link>
            <Link to="/teacher/results" className="secondary-button">
              Open results
            </Link>
            <Link to="/teacher/homework" className="secondary-button">
              Homework
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
        <DashboardCard label="Review queue" value={pendingAssignments.length} helper="Submitted homework to inspect" tone="info" />
        <DashboardCard label="Homework total" value={assignments.length} helper="All homework submissions" tone="success" />
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
          title="Homework review"
          description="Inspect AI feedback, transcripts, and wrong answers from student homework."
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
