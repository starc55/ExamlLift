import { useMemo, useState } from "react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import ResultTable from "../../components/dashboard/ResultTable";
import Modal from "../../components/layout/Modal";
import { getAllResults } from "../../services/results/resultService";

function TeacherResultsPage() {
  const [sectionFilter, setSectionFilter] = useState("all");
  const [selectedResult, setSelectedResult] = useState(null);
  const results = useMemo(() => getAllResults(), []);

  const filteredResults = results.filter((result) => {
    if (sectionFilter === "all") {
      return true;
    }

    return result.section === sectionFilter;
  });

  const averagePercent = filteredResults.length
    ? Math.round(
        filteredResults.reduce((total, item) => total + item.percent, 0) /
          filteredResults.length
      )
    : 0;

  return (
    <div className="page-stack">
      <section className="dashboard-grid dashboard-grid--compact">
        <DashboardCard
          label="Filtered results"
          value={filteredResults.length}
          helper="Current table rows"
        />
        <DashboardCard
          label="Average score"
          value={`${averagePercent}%`}
          helper="For the selected section"
          tone="success"
        />
        <DashboardCard
          label="Latest section"
          value={filteredResults[0]?.section || "-"}
          helper="Most recent saved result"
          tone="info"
        />
      </section>

      <section className="section-heading section-heading--with-tools">
        <div>
          <p className="eyebrow">Student results</p>
          <h2>Filter by section and inspect AI feedback</h2>
        </div>
        <div className="filter-row">
          <select value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)}>
            <option value="all">All sections</option>
            <option value="midterm">Midterm</option>
            <option value="final">Final</option>
          </select>
        </div>
      </section>

      <ResultTable results={filteredResults} onViewFeedback={setSelectedResult} />

      <Modal
        isOpen={Boolean(selectedResult)}
        title={selectedResult?.studentName || "Feedback"}
        onClose={() => setSelectedResult(null)}
      >
        <div className="modal-card__content">
          <p>
            <strong>{selectedResult?.testTitle}</strong>
          </p>
          <p>
            {selectedResult?.score}/{selectedResult?.maxScore} • {selectedResult?.percent}%
          </p>
          <pre>{selectedResult?.feedback}</pre>
        </div>
      </Modal>
    </div>
  );
}

export default TeacherResultsPage;
