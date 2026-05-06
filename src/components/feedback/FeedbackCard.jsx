function FeedbackCard({ title = "AI Feedback", feedback }) {
  if (!feedback) {
    return null;
  }

  const lines = feedback.split("\n").filter(Boolean);

  return (
    <section className="card feedback-card">
      <div className="feedback-card__header">
        <h3>{title}</h3>
        <span className="pill pill--soft">Max 120 words</span>
      </div>
      <div className="feedback-card__content">
        {lines.map((line, index) => (
          <p key={`${line}-${index}`} className={line.startsWith("*") ? "feedback-bullet" : ""}>
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}

export default FeedbackCard;
