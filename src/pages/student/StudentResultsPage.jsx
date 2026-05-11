import { useMemo, useState } from "react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import Modal from "../../components/layout/Modal";
import ResultDetails from "../../components/results/ResultDetails";
import { useAuth } from "../../context/AuthContext";
import { getStudentResults } from "../../services/results/resultService";

const resultTypeLabels = {
  midterm: "Midterm Result",
  final: "Final Exam Result",
  homework: "Homework Result",
};

function getFeedbackPreview(feedback = "") {
  return feedback.split(/\s+/).filter(Boolean).slice(0, 28).join(" ");
}

function StudentResultsPage() {
  const { currentUser } = useAuth();
  const [selectedResult, setSelectedResult] = useState(null);
  const results = useMemo(
    () => getStudentResults(currentUser.id),
    [currentUser.id]
  );
  const averagePercent = results.length
    ? Math.round(
        results.reduce(
          (total, item) => total + (item.percentage || item.percent),
          0
        ) / results.length
      )
    : 0;
  const highestScore = results.length
    ? Math.max(...results.map((result) => result.percentage || result.percent))
    : 0;

  return (
    <div className="page-stack">
      <section className="dashboard-grid dashboard-grid--compact">
        <DashboardCard
          label="Results"
          value={results.length}
          helper="Grouped exam and homework results"
        />
        <DashboardCard
          label="Average"
          value={`${averagePercent}%`}
          helper="Across grouped results"
          tone="success"
        />
        <DashboardCard
          label="Best score"
          value={`${highestScore}%`}
          helper="Highest overall result"
          tone="info"
        />
      </section>

      <section className="section-heading">
        <div>
          <p className="eyebrow">Student results</p>
          <h2>Grouped results with AI feedback and section details</h2>
        </div>
      </section>

      {results.length ? (
        <section className="result-card-grid">
          {results.map((result) => (
            <article key={result.id} className="card result-card">
              <div className="feedback-card__header">
                <div>
                  <p className="eyebrow">
                    {resultTypeLabels[result.examType] || "Result"}
                  </p>
                  <h3>{result.title || result.testTitle}</h3>
                </div>
                <span className="pill pill--soft">
                  {new Date(result.submittedAt).toLocaleDateString()}
                </span>
              </div>

              <div className="result-card__metrics">
                <span>
                  <strong>{result.overallScore ?? result.score}</strong>/
                  {result.totalScore || result.total || result.maxScore}
                </span>
                <span>{result.percentage || result.percent}%</span>
                <span>
                  CEFR {result.overallCEFR || result.cefrLevel || "-"}
                </span>
              </div>

              <p>
                {getFeedbackPreview(result.aiFeedback || result.feedback)}...
              </p>
              <button
                className="secondary-button"
                onClick={() => setSelectedResult(result)}
              >
                View details
              </button>
            </article>
          ))}
        </section>
      ) : (
        <section className="card empty-state">
          <h3>No data yet</h3>
          <p>Results will appear here after you complete a test or homework.</p>
        </section>
      )}

      <Modal
        isOpen={Boolean(selectedResult)}
        title={selectedResult?.title || "Result details"}
        onClose={() => setSelectedResult(null)}
      >
        <ResultDetails result={selectedResult} />
      </Modal>
    </div>
  );
}

export default StudentResultsPage;
