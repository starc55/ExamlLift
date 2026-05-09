import DashboardCard from "../../components/dashboard/DashboardCard";
import { useAuth } from "../../context/AuthContext";
import { getAllContent } from "../../services/content/contentService";
import { getAllHomeworkSubmissions } from "../../services/homework/homeworkService";
import { getAllTests } from "../../services/tests/testService";

function TeacherProfilePage() {
  const { currentUser } = useAuth();
  const contentCount = getAllContent().filter(
    (item) => item.createdBy === currentUser.id
  ).length;
  const testsCount = getAllTests().length;
  const assignments = getAllHomeworkSubmissions().filter(
    (submission) => submission.teacherId === currentUser.id
  );
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
            Your teacher account, upload activity, test management status, and
            student task review queue are summarized here.
          </p>
        </div>
        <div className="dashboard-grid dashboard-grid--compact">
          <DashboardCard label="My lessons" value={contentCount} helper="Uploaded by this teacher" />
          <DashboardCard label="Managed tests" value={testsCount} helper="All active assessments" tone="info" />
          <DashboardCard label="Review queue" value={pendingAssignments} helper="Need review" tone="success" />
        </div>
      </section>

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
            <span>Specialization</span>
            <strong>{currentUser.specialization || "English teacher"}</strong>
          </div>
          <div>
            <span>Auth mode</span>
            <strong>Role-based local auth</strong>
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
