import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardCard from "../../components/dashboard/DashboardCard";
import ErrorAlert from "../../components/feedback/ErrorAlert";
import ProgressBar from "../../components/ProgressBar";
import TestCard from "../../components/cards/TestCard";
import { useAuth } from "../../context/AuthContext";
import { getAllContent } from "../../services/content/contentService";
import { getHomeworkSubmissionsByStudent } from "../../services/homework/homeworkService";
import { getStudentResults } from "../../services/results/resultService";
import { getStudentTestsByClass } from "../../services/tests/testService";
import {
  getMyClasses,
  joinClassByCode,
} from "../../services/classes/studentClassService";

function StudentDashboardPage() {
  const { currentUser } = useAuth();
  const [classes, setClasses] = useState([]);
  const [contentCount, setContentCount] = useState(0);
  const [tests, setTests] = useState([]);
  const [results, setResults] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const nextClasses = await getMyClasses();
      const defaultClassId = nextClasses[0]?.id || null;
      const [nextContent, nextTests, nextResults, nextAssignments] =
        await Promise.all([
          getAllContent(),
          getStudentTestsByClass(defaultClassId),
          getStudentResults(currentUser.id),
          getHomeworkSubmissionsByStudent(currentUser.id),
        ]);

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
  };

  useEffect(() => {
    loadDashboard();
  }, [currentUser.id]);

  const handleJoinClass = async (event) => {
    event.preventDefault();

    if (!inviteCode.trim()) {
      setError("Invite code kiriting.");
      return;
    }

    setJoining(true);
    setError("");
    setMessage("");

    try {
      const joinedClass = await joinClassByCode(inviteCode);
      setMessage(`${joinedClass.title} classiga qo'shildingiz.`);
      setInviteCode("");
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setJoining(false);
    }
  };

  const averageScore = results.length
    ? Math.round(
        results.reduce((total, item) => total + (item.percentage || item.percent), 0) /
          results.length
      )
    : 0;
  const submittedHomework = assignments.length;
  const averageHomework = assignments.length
    ? Math.round(
        assignments.reduce((total, item) => total + (item.percentage || 0), 0) /
          assignments.length
      )
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
            Review class content, submit homework, complete assessments, and track
            all results from one place.
          </p>
          <div className="hero-card__actions">
            <Link to="/student/content" className="primary-button">
              Open content
            </Link>
            <Link to="/student/results" className="secondary-button">
              View results
            </Link>
            <Link to="/student/homework" className="secondary-button">
              Homework center
            </Link>
          </div>
        </div>
        <div className="hero-card__stats">
          <DashboardCard
            label="Classes"
            value={classes.length}
            helper="Joined with invite code"
          />
          <DashboardCard
            label="Homework"
            value={assignments.length}
            helper="Submitted tasks"
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

      <TestCard
        title="Join Class"
        description="Enter your teacher's invite code to unlock class content, tests, and homework."
        stats="IELTS-XXXXX"
      >
        <form className="assignment-form" onSubmit={handleJoinClass}>
          <label>
            Invite code
            <input
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              placeholder="IELTS-A23K7"
            />
          </label>
          <button className="primary-button" type="submit" disabled={joining}>
            {joining ? "Joining..." : "Join class"}
          </button>
        </form>
        {message ? <p className="success-text">{message}</p> : null}
        <ErrorAlert message={error} />
      </TestCard>

      {loading ? <p className="empty-copy">Loading dashboard...</p> : null}

      <section className="dashboard-grid dashboard-grid--compact">
        <DashboardCard
          label="Submitted homework"
          value={submittedHomework}
          helper="Saved homework attempts"
          tone="success"
        />
        <DashboardCard
          label="Available tests"
          value={tests.length}
          helper="Class assessment blocks"
          tone="info"
        />
        <DashboardCard
          label="Saved attempts"
          value={results.length}
          helper="Every finished exam is stored"
        />
      </section>

      <section className="dashboard-grid dashboard-grid--features">
        <TestCard
          title="Content journey"
          description="Class topic list, notes, audio, PDF, and media resources."
          stats={`${contentCount} lessons`}
        >
          <ProgressBar label="Library readiness" value={classes.length ? 100 : 0} />
          <Link to="/student/content" className="primary-button card-link">
            Browse lessons
          </Link>
        </TestCard>
        <TestCard
          title="Midterm Control"
          description="Vocabulary, grammar, and speaking in a grouped result."
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
          title="Homework status"
          description="Submit writing, speaking, objective, or file-based homework from one center."
          stats={`${submittedHomework} submitted`}
        >
          <ProgressBar label="Homework score average" value={averageHomework} />
          <Link to="/student/homework" className="primary-button card-link">
            Send homework
          </Link>
        </TestCard>
      </section>
    </div>
  );
}

export default StudentDashboardPage;
