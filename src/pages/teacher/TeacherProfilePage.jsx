import { useEffect, useState } from "react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import ErrorAlert from "../../components/feedback/ErrorAlert";
import { useAuth } from "../../context/AuthContext";
import { getContentList } from "../../services/content/contentService";
import { getAllHomeworkSubmissions } from "../../services/homework/homeworkService";
import { getTeacherTests } from "../../services/tests/testService";

function TeacherProfilePage() {
  const { currentUser } = useAuth();
  const [contentCount, setContentCount] = useState(0);
  const [testsCount, setTestsCount] = useState(0);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProfileStats() {
      setLoading(true);
      setError("");

      try {
        const [content, tests, submissions] = await Promise.all([
          getContentList(),
          getTeacherTests(),
          getAllHomeworkSubmissions(),
        ]);

        if (!isMounted) {
          return;
        }

        setContentCount(content.filter((item) => item.createdBy === currentUser.id).length);
        setTestsCount(tests.length);
        setAssignments(submissions);
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

  const pendingAssignments = assignments.filter(
    (assignment) => assignment.status === "submitted"
  ).length;

  return (
    <div className="page-stack">
      <section className="profile-hero card">
        <div>
          <p className="eyebrow">Teacher profile</p>
          <h2>{currentUser.fullname}</h2>
          <p>
            Your Supabase teacher account, upload activity, test management
            status, and student review queue are summarized here.
          </p>
        </div>
        <div className="dashboard-grid dashboard-grid--compact">
          <DashboardCard label="My lessons" value={contentCount} helper="Uploaded by this teacher" />
          <DashboardCard label="Managed tests" value={testsCount} helper="All active assessments" tone="info" />
          <DashboardCard label="Review queue" value={pendingAssignments} helper="Need review" tone="success" />
        </div>
      </section>

      {loading ? <p className="empty-copy">Loading profile...</p> : null}
      <ErrorAlert message={error} />

      <section className="card profile-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Teacher details</p>
            <h2>Workspace information</h2>
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
            <strong>{currentUser.fullname || "Teacher"}</strong>
          </div>
          <div>
            <span>Auth mode</span>
            <strong>Supabase Auth</strong>
          </div>
          <div>
            <span>Homework in queue</span>
            <strong>{pendingAssignments}</strong>
          </div>
          <div>
            <span>Total submissions</span>
            <strong>{assignments.length}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

export default TeacherProfilePage;
