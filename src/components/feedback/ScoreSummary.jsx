function ScoreSummary({
  title = "Natija",
  score = 0,
  total = 0,
  percentage = 0,
  band = null,
  cefrLevel = null,
}) {
  return (
    <section className="card score-summary">
      <div className="feedback-card__header">
        <h3>{title}</h3>
        <span className="pill pill--soft">{percentage}%</span>
      </div>
      <div className="score-summary__grid">
        <div className="score-summary__item">
          <strong>{score}</strong>
          <span>Score</span>
        </div>
        <div className="score-summary__item">
          <strong>{total}</strong>
          <span>Total</span>
        </div>
        <div className="score-summary__item">
          <strong>{percentage}%</strong>
          <span>Percentage</span>
        </div>
        <div className="score-summary__item">
          <strong>{cefrLevel || band || "-"}</strong>
          <span>{cefrLevel ? "CEFR" : "Band"}</span>
        </div>
      </div>
    </section>
  );
}

export default ScoreSummary;
