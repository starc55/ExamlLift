import { useEffect, useState } from "react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import ErrorAlert from "../../components/feedback/ErrorAlert";
import { useAuth } from "../../context/AuthContext";
import { getHomeworkSubmissionsByStudent } from "../../services/homework/homeworkService";
import { getStudentResults } from "../../services/results/resultService";

function StudentProfilePage() {
  const { currentUser } = useAuth();
  const [results, setResults] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProfileStats() {
      setLoading(true);
      setError("");

      try {
        const [nextResults, nextAssignments] = await Promise.all([
          getStudentResults(currentUser.id),
          getHomeworkSubmissionsByStudent(currentUser.id),
        ]);

        if (!isMounted) {
          return;
        }

        setResults(nextResults);
        setAssignments(nextAssignments);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    loadProfileStats();

    return () => {
      isMounted = false;
    };
  }, [currentUser.id]);

  const averageScore = results.length
    ? Math.round(
        results.reduce((total, item) => total + (item.percentage || item.percent), 0) /
          results.length
      )
    : 0;

  return (
    <div className="page-stack">
      <section className="profile-hero card">
        <div>
          <p className="eyebrow">Student profile</p>
          <h2>{currentUser.fullname}</h2>
          <p>
            Your Supabase account, homework status, and assessment results are
            gathered here in one overview.
          </p>
        </div>
        <div className="dashboard-grid dashboard-grid--compact">
          <DashboardCard label="Average score" value={`${averageScore}%`} helper="Across all saved sections" tone="success" />
          <DashboardCard label="Homework" value={assignments.length} helper="Submitted homework tasks" tone="info" />
          <DashboardCard label="Scored homework" value={assignments.filter((item) => item.feedback).length} helper="With saved feedback" />
        </div>
      </section>

      {loading ? <p className="empty-copy">Loading profile...</p> : null}
      <ErrorAlert message={error} />

      <section className="card profile-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Account details</p>
            <h2>Student information</h2>
          </div>
        </div>
        <div className="profile-grid">
          <div>
            <span>Email</span>
            <strong>{currentUser.email}</strong>
          </div>
          <div>
            <span>Role</span>
            <strong>{currentUser.role}</strong>
          </div>
          <div>
            <span>Name</span>
            <strong>{currentUser.fullname || "Student"}</strong>
          </div>
          <div>
            <span>Storage mode</span>
            <strong>Supabase database</strong>
          </div>
          <div>
            <span>Total attempts</span>
            <strong>{results.length}</strong>
          </div>
          <div>
            <span>Homework submitted</span>
            <strong>{assignments.length}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

export default StudentProfilePage;
