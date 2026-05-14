import { useEffect, useState } from "react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import ResultTable from "../../components/dashboard/ResultTable";
import ErrorAlert from "../../components/feedback/ErrorAlert";
import Modal from "../../components/layout/Modal";
import ResultDetails from "../../components/results/ResultDetails";
import { getAllResults } from "../../services/results/resultService";

function TeacherResultsPage() {
  const [sectionFilter, setSectionFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [examTypeFilter, setExamTypeFilter] = useState("all");
  const [selectedResult, setSelectedResult] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadResults() {
      setLoading(true);
      setError("");

      try {
        const data = await getAllResults();

        if (isMounted) {
          setResults(data);
        }
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    loadResults();

    return () => {
      isMounted = false;
    };
  }, []);
  const studentOptions = [...new Set(results.map((result) => result.studentName).filter(Boolean))];

  const filteredResults = results.filter((result) => {
    if (sectionFilter !== "all" && result.section !== sectionFilter) {
      return false;
    }

    if (studentFilter !== "all" && result.studentName !== studentFilter) {
      return false;
    }

    if (examTypeFilter !== "all" && (result.examType || result.section) !== examTypeFilter) {
      return false;
    }

    if (dateFilter) {
      const submittedDate = new Date(result.submittedAt).toISOString().slice(0, 10);
      if (submittedDate !== dateFilter) {
        return false;
      }
    }

    return true;
  });

  const averagePercent = filteredResults.length
    ? Math.round(
        filteredResults.reduce(
          (total, item) => total + (item.percentage || item.percent),
          0
        ) / filteredResults.length
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
          helper="For the active filters"
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
            <option value="homework">Homework</option>
          </select>
          <select value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)}>
            <option value="all">All students</option>
            {studentOptions.map((studentName) => (
              <option key={studentName} value={studentName}>
                {studentName}
              </option>
            ))}
          </select>
          <select value={examTypeFilter} onChange={(event) => setExamTypeFilter(event.target.value)}>
            <option value="all">All exam types</option>
            <option value="midterm">midterm</option>
            <option value="final">final</option>
            <option value="homework">homework</option>
          </select>
          <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
        </div>
      </section>

      {loading ? <p className="empty-copy">Loading results...</p> : null}
      <ErrorAlert message={error} />

      <ResultTable results={filteredResults} onViewFeedback={setSelectedResult} />

      <Modal
        isOpen={Boolean(selectedResult)}
        title={selectedResult?.studentName || "Feedback"}
        onClose={() => setSelectedResult(null)}
      >
        {selectedResult ? (
          <ResultDetails result={selectedResult} />
        ) : null}
      </Modal>
    </div>
  );
}

export default TeacherResultsPage;
