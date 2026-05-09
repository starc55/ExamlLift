function renderWrongAnswerText(item) {
  if (item.question) {
    return (
      <>
        <strong>{item.question}</strong>
        <span>
          Sizning javobingiz: {item.studentAnswer || "-"} | To'g'ri javob:{" "}
          {item.correctAnswer}
        </span>
        {item.grammarTopic ? <span>Topic: {item.grammarTopic}</span> : null}
      </>
    );
  }

  if (item.term) {
    return (
      <>
        <strong>{item.term}</strong>
        <span>
          Sizning javobingiz: {item.studentAnswer || "-"} | To'g'ri javob:{" "}
          {item.correctAnswer}
        </span>
        {item.correctDefinition ? <span>Meaning: {item.correctDefinition}</span> : null}
      </>
    );
  }

  return (
    <>
      <strong>Detail</strong>
      <span>{JSON.stringify(item)}</span>
    </>
  );
}

function WrongAnswersList({
  title = "Noto'g'ri javoblar",
  items = [],
  emptyText = "Xato javob topilmadi.",
}) {
  return (
    <section className="card wrong-answers-card">
      <div className="feedback-card__header">
        <h3>{title}</h3>
        <span className="pill pill--soft">{items.length} item</span>
      </div>
      {items.length ? (
        <div className="wrong-answers-list">
          {items.map((item, index) => (
            <article key={`${item.id || item.term || item.question}-${index}`} className="wrong-answer-item">
              {renderWrongAnswerText(item)}
            </article>
          ))}
        </div>
      ) : (
        <p className="success-text">{emptyText}</p>
      )}
    </section>
  );
}

export default WrongAnswersList;
