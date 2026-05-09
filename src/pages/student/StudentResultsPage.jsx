import { useMemo, useState } from "react";
import CriteriaBreakdown from "../../components/feedback/CriteriaBreakdown";
import FeedbackCard from "../../components/feedback/FeedbackCard";
import ScoreSummary from "../../components/feedback/ScoreSummary";
import WrongAnswersList from "../../components/feedback/WrongAnswersList";
import DashboardCard from "../../components/dashboard/DashboardCard";
import ResultTable from "../../components/dashboard/ResultTable";
import Modal from "../../components/layout/Modal";
import { useAuth } from "../../context/AuthContext";
import { getStudentResults } from "../../services/results/resultService";

function StudentResultsPage() {
  const { currentUser } = useAuth();
  const [selectedResult, setSelectedResult] = useState(null);
  const results = useMemo(() => getStudentResults(currentUser.id), [currentUser.id]);
  const averagePercent = results.length
    ? Math.round(
        results.reduce((total, item) => total + (item.percentage || item.percent), 0) /
          results.length
      )
    : 0;
  const highestScore = results.length
    ? Math.max(...results.map((result) => result.percentage || result.percent))
    : 0;

  return (
    <div className="page-stack">
      <section className="dashboard-grid dashboard-grid--compact">
        <DashboardCard
          label="Attempts"
          value={results.length}
          helper="Saved in local storage"
        />
        <DashboardCard
          label="Average"
          value={`${averagePercent}%`}
          helper="Across all sections"
          tone="success"
        />
        <DashboardCard
          label="Best score"
          value={`${highestScore}%`}
          helper="Highest section result"
          tone="info"
        />
      </section>

      <section className="section-heading">
        <div>
          <p className="eyebrow">Student results</p>
          <h2>All saved attempts and AI feedback summaries</h2>
        </div>
      </section>

      <ResultTable
        results={results}
        emptyText="Results will appear here after you complete a test."
        onViewFeedback={setSelectedResult}
      />

      <Modal
        isOpen={Boolean(selectedResult)}
        title={selectedResult?.testTitle || "Feedback"}
        onClose={() => setSelectedResult(null)}
      >
        {selectedResult ? (
          <div className="modal-card__content">
            <ScoreSummary
              title="Assessment summary"
              score={selectedResult.score}
              total={selectedResult.total || selectedResult.maxScore}
              percentage={selectedResult.percentage || selectedResult.percent}
              band={selectedResult.band}
            />
            <CriteriaBreakdown criteria={selectedResult.criteria} />
            <WrongAnswersList
              items={selectedResult.wrongAnswers}
              emptyText="Bu natijada noto'g'ri javoblar saqlanmagan."
            />
            <FeedbackCard title="Detailed AI feedback" feedback={selectedResult.feedback} />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export default StudentResultsPage;
