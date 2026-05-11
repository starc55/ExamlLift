function ResultTable({ results, emptyText = "No results found.", onViewFeedback }) {
  if (!results.length) {
    return (
      <section className="card empty-state">
        <h3>No data yet</h3>
        <p>{emptyText}</p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="table-scroll">
        <table className="result-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Test</th>
              <th>Section</th>
              <th>Type</th>
              <th>Score</th>
              <th>Percent</th>
              <th>CEFR</th>
              <th>Submitted</th>
              <th>Feedback</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.id}>
                <td data-label="Student">{result.studentName || "-"}</td>
                <td data-label="Test">{result.title || result.testTitle}</td>
                <td data-label="Section">{result.section || result.examType}</td>
                <td data-label="Type">{result.type}</td>
                <td data-label="Score">
                  {result.overallScore ?? result.score}/{result.totalScore || result.total || result.maxScore}
                </td>
                <td data-label="Percent">{result.percentage || result.percent}%</td>
                <td data-label="CEFR">{result.overallCEFR || result.cefrLevel || result.band || "-"}</td>
                <td data-label="Submitted">{new Date(result.submittedAt).toLocaleDateString()}</td>
                <td data-label="Feedback">
                  <button
                    className="secondary-button"
                    onClick={() => onViewFeedback?.(result)}
                  >
                    View details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default ResultTable;
