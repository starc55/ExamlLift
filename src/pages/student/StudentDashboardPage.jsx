import { Link } from "react-router-dom";
import DashboardCard from "../../components/dashboard/DashboardCard";
import ProgressBar from "../../components/ProgressBar";
import TestCard from "../../components/cards/TestCard";
import { useAuth } from "../../context/AuthContext";
import { getAssignmentsForStudent } from "../../services/content/assignmentService";
import { getAllContent } from "../../services/content/contentService";
import { getStudentResults } from "../../services/results/resultService";
import { getAllTests } from "../../services/tests/testService";

function StudentDashboardPage() {
  const { currentUser } = useAuth();
  const contentCount = getAllContent().length;
  const tests = getAllTests();
  const results = getStudentResults(currentUser.id);
  const assignments = getAssignmentsForStudent(currentUser.id);
  const averageScore = results.length
    ? Math.round(
        results.reduce((total, item) => total + item.percent, 0) /
          results.length
      )
    : 0;
  const acceptedAssignments = assignments.filter(
    (assignment) => assignment.status === "accepted"
  ).length;
  const approvalRate = assignments.length
    ? Math.round((acceptedAssignments / assignments.length) * 100)
    : 0;

  return (
    <div className="page-stack">
      <section className="hero-card hero-card--blue">
        <div>
          <p className="eyebrow">Student workspace</p>
          <h3>
            {currentUser.fullname}, every learning block is ready in order
          </h3>
          <p className="hero-card__description">
            Review content, submit homework, complete the midterm and final step
            by step, and track all results from one place.
          </p>
          <div className="hero-card__actions">
            <Link to="/student/content" className="primary-button">
              Open content
            </Link>
            <Link to="/student/results" className="secondary-button">
              View results
            </Link>
          </div>
        </div>
        <div className="hero-card__stats">
          <DashboardCard
            label="Content modules"
            value={contentCount}
            helper="Topic and media lessons"
          />
          <DashboardCard
            label="Assignments"
            value={assignments.length}
            helper="Sent to the teacher"
            tone="info"
          />
          <DashboardCard
            label="Average score"
            value={`${averageScore}%`}
            helper="Latest performance snapshot"
            tone="success"
          />
        </div>
      </section>

      <section className="dashboard-grid dashboard-grid--compact">
        <DashboardCard
          label="Accepted tasks"
          value={acceptedAssignments}
          helper="Teacher-approved uploads"
          tone="success"
        />
        <DashboardCard
          label="Available tests"
          value={tests.length}
          helper="Midterm and final sections"
          tone="info"
        />
        <DashboardCard
          label="Saved attempts"
          value={results.length}
          helper="Every finished section is stored"
        />
      </section>

      <section className="dashboard-grid dashboard-grid--features">
        <TestCard
          title="Content journey"
          description="Compact topic list, rich notes, audio, PDF, and assignment upload."
          stats={`${contentCount} lessons`}
        >
          <ProgressBar label="Library readiness" value={100} />
          <Link to="/student/content" className="primary-button card-link">
            Browse lessons
          </Link>
        </TestCard>
        <TestCard
          title="Midterm Control"
          description="Intro screen, start button, and sequential sections."
          stats="Step by step"
        >
          <ProgressBar label="Assessment coverage" value={78} />
          <Link to="/student/midterm" className="primary-button card-link">
            Start midterm
          </Link>
        </TestCard>
        <TestCard
          title="Final Control"
          description="Listening, reading, writing, and speaking in one guided flow."
          stats="Guided workflow"
        >
          <ProgressBar label="Final readiness" value={84} />
          <Link to="/student/final" className="primary-button card-link">
            Open final
          </Link>
        </TestCard>
        <TestCard
          title="Assignment status"
          description="At the end of each lesson, you can send a file or note to the teacher."
          stats={`${acceptedAssignments} accepted`}
        >
          <ProgressBar label="Teacher approval rate" value={approvalRate} />
          <Link to="/student/content" className="secondary-button card-link">
            Send homework
          </Link>
        </TestCard>
      </section>
    </div>
  );
}

export default StudentDashboardPage;
