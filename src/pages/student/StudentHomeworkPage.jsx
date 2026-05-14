import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardCard from "../../components/dashboard/DashboardCard";
import ErrorAlert from "../../components/feedback/ErrorAlert";
import TestCard from "../../components/cards/TestCard";
import { useAuth } from "../../context/AuthContext";
import {
  getHomeworkSubmissionsByStudent,
  getLatestHomeworkSubmission,
  getStudentHomeworks,
} from "../../services/homework/homeworkService";

function StudentHomeworkPage() {
  const { currentUser } = useAuth();
  const [homeworkItems, setHomeworkItems] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [latestByHomework, setLatestByHomework] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadHomework() {
      setLoading(true);
      setError("");

      try {
        const [nextHomework, nextSubmissions] = await Promise.all([
          getStudentHomeworks(),
          getHomeworkSubmissionsByStudent(currentUser.id),
        ]);
        const latestEntries = await Promise.all(
          nextHomework.map(async (homework) => [
            homework.id,
            await getLatestHomeworkSubmission(homework.id, currentUser.id),
          ])
        );

        if (!isMounted) {
          return;
        }

        setHomeworkItems(nextHomework);
        setSubmissions(nextSubmissions);
        setLatestByHomework(Object.fromEntries(latestEntries));
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    loadHomework();

    return () => {
      isMounted = false;
    };
  }, [currentUser.id]);

  const completedCount = submissions.length;
  const averagePercentage = submissions.length
    ? Math.round(
        submissions.reduce((total, item) => total + item.percentage, 0) / submissions.length
      )
    : 0;

  return (
    <div className="page-stack">
      <section className="dashboard-grid dashboard-grid--compact">
        <DashboardCard label="Homework tasks" value={homeworkItems.length} helper="Available to submit" />
        <DashboardCard label="Submitted" value={completedCount} helper="Your latest uploads" tone="info" />
        <DashboardCard label="Average" value={`${averagePercentage}%`} helper="Across scored homework" tone="success" />
      </section>

      <section className="section-heading">
        <div>
          <p className="eyebrow">Homework center</p>
          <h2>Open tasks and AI-supported submissions</h2>
        </div>
      </section>

      {loading ? <p className="empty-copy">Loading homework...</p> : null}
      <ErrorAlert message={error} />

      <section className="dashboard-grid dashboard-grid--features">
        {!loading && !homeworkItems.length ? (
          <section className="card empty-state">
            <h3>No homework yet</h3>
            <p>Join a class or wait for your teacher to create homework.</p>
          </section>
        ) : null}
        {homeworkItems.map((homework) => {
          const latestSubmission = latestByHomework[homework.id];

          return (
            <TestCard
              key={homework.id}
              title={homework.title}
              description={homework.instructions}
              stats={`${homework.type} | Due ${homework.deadline || "-"}`}
            >
              <div className="content-card__meta">
                <span>{homework.level}</span>
                <span>{latestSubmission?.status || "not submitted"}</span>
                <span>{latestSubmission?.band ? `Band ${latestSubmission.band}` : "No band yet"}</span>
              </div>
              <Link to={`/student/homework/${homework.id}`} className="primary-button card-link">
                Open homework
              </Link>
            </TestCard>
          );
        })}
      </section>
    </div>
  );
}

export default StudentHomeworkPage;
