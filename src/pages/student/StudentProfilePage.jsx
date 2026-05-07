import DashboardCard from "../../components/dashboard/DashboardCard";
import { useAuth } from "../../context/AuthContext";
import { getAssignmentsForStudent } from "../../services/content/assignmentService";
import { getStudentResults } from "../../services/results/resultService";

function StudentProfilePage() {
  const { currentUser } = useAuth();
  const results = getStudentResults(currentUser.id);
  const assignments = getAssignmentsForStudent(currentUser.id);
  const acceptedAssignments = assignments.filter(
    (assignment) => assignment.status === "accepted"
  ).length;
  const averageScore = results.length
    ? Math.round(results.reduce((total, item) => total + item.percent, 0) / results.length)
    : 0;

  return (
    <div className="page-stack">
      <section className="profile-hero card">
        <div>
          <p className="eyebrow">Student profile</p>
          <h2>{currentUser.fullname}</h2>
          <p>
            Your account, target band, homework status, and assessment results are
            gathered here in one clean overview.
          </p>
        </div>
        <div className="dashboard-grid dashboard-grid--compact">
          <DashboardCard label="Average score" value={`${averageScore}%`} helper="Across all saved sections" tone="success" />
          <DashboardCard label="Assignments" value={assignments.length} helper="Homework submissions" tone="info" />
          <DashboardCard label="Accepted" value={acceptedAssignments} helper="Teacher approved tasks" />
        </div>
      </section>

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
            <span>Target band</span>
            <strong>{currentUser.targetBand || "6.5"}</strong>
          </div>
          <div>
            <span>Storage mode</span>
            <strong>Local storage mode</strong>
          </div>
          <div>
            <span>Total attempts</span>
            <strong>{results.length}</strong>
          </div>
          <div>
            <span>Homework approved</span>
            <strong>{acceptedAssignments}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

export default StudentProfilePage;
