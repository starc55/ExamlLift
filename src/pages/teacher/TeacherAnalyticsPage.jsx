import DashboardCard from "../../components/dashboard/DashboardCard";
import ProgressBar from "../../components/ProgressBar";
import { getAllResults } from "../../services/results/resultService";

function TeacherAnalyticsPage() {
  const results = getAllResults();
  const sectionAverage = (section) => {
    const sectionResults = results.filter((item) => item.section === section);

    if (!sectionResults.length) {
      return 0;
    }

    return Math.round(
      sectionResults.reduce((total, item) => total + item.percent, 0) / sectionResults.length
    );
  };

  const typeCounts = results.reduce((accumulator, item) => {
    accumulator[item.type] = (accumulator[item.type] || 0) + 1;
    return accumulator;
  }, {});

  return (
    <div className="page-stack">
      <section className="dashboard-grid">
        <DashboardCard label="Midterm average" value={`${sectionAverage("midterm")}%`} helper="Across all saved attempts" />
        <DashboardCard label="Final average" value={`${sectionAverage("final")}%`} helper="Writing, reading, listening, speaking" tone="success" />
        <DashboardCard label="Total submissions" value={results.length} helper="Local analytics feed" tone="info" />
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Type analytics</p>
            <h2>Result distribution by skill</h2>
          </div>
        </div>
        <div className="analytics-list">
          {Object.entries(typeCounts).map(([type, count]) => (
            <ProgressBar
              key={type}
              label={`${type} attempts`}
              value={Math.min(100, count * 20)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default TeacherAnalyticsPage;
