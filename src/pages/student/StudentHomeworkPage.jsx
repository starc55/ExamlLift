import { Link } from "react-router-dom";
import DashboardCard from "../../components/dashboard/DashboardCard";
import TestCard from "../../components/cards/TestCard";
import { useAuth } from "../../context/AuthContext";
import {
  getAllHomework,
  getHomeworkSubmissionsByStudent,
  getLatestHomeworkSubmission,
} from "../../services/homework/homeworkService";

function StudentHomeworkPage() {
  const { currentUser } = useAuth();
  const homeworkItems = getAllHomework();
  const submissions = getHomeworkSubmissionsByStudent(currentUser.id);
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

      <section className="dashboard-grid dashboard-grid--features">
        {homeworkItems.map((homework) => {
          const latestSubmission = getLatestHomeworkSubmission(homework.id, currentUser.id);

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
