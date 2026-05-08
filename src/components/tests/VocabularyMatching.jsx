function VocabularyMatching({
  data,
  answers,
  onAnswerChange,
  onSubmit,
  result,
  onContinue,
  submitLabel = "Javoblarni yuborish",
  continueLabel = "Grammar bo'limiga o'tish",
}) {
  const isComplete = data.words.every((word) => answers[word.id]);
  const selectedValues = Object.values(answers).filter(Boolean);

  const isOptionDisabled = (definitionKey, wordId) => {
    return data.words.some(
      (word) => word.id !== wordId && answers[word.id] === definitionKey
    );
  };

  return (
    <div className="vocabulary-matching">
      <div className="vocabulary-matching__intro">
        <span className="pill">Column A - Column B matching</span>
        <p>{data.instruction}</p>
      </div>

      <div className="vocabulary-matching__grid">
        <section className="vocabulary-matching__panel">
          <div className="vocabulary-matching__panel-header">
            <h4>Column A</h4>
            <span>
              {selectedValues.length}/{data.words.length} selected
            </span>
          </div>
          <div className="vocabulary-matching__rows">
            {data.words.map((word) => (
              <div key={word.id} className="vocabulary-matching__row">
                <div className="vocabulary-matching__term">
                  <span className="vocabulary-matching__number">
                    {word.id}.
                  </span>
                  <span>{word.term}</span>
                </div>
                <select
                  className="vocabulary-matching__select"
                  value={answers[word.id] || ""}
                  onChange={(event) =>
                    onAnswerChange(word.id, event.target.value)
                  }
                  disabled={Boolean(result)}
                >
                  <option value="">Select</option>
                  {data.definitions.map((definition) => (
                    <option
                      key={definition.key}
                      value={definition.key}
                      disabled={isOptionDisabled(definition.key, word.id)}
                    >
                      {definition.key}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>

        <section className="vocabulary-matching__panel vocabulary-matching__panel--definitions">
          <div className="vocabulary-matching__panel-header vocabulary-matching__panel-header--accent">
            <h4>Column B</h4>
            <span>Definitions</span>
          </div>
          <div className="vocabulary-matching__definitions">
            {data.definitions.map((definition) => (
              <div
                key={definition.key}
                className="vocabulary-matching__definition"
              >
                <strong>{definition.key}.</strong>
                <span>{definition.text}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {result ? (
        <div className="vocabulary-matching__result">
          <div className="vocabulary-matching__summary">
            <span className="pill">
              {result.correctCount}/{result.totalQuestions} correct
            </span>
            <span className="pill pill--soft">{result.percent}% score</span>
          </div>

          <section className="vocabulary-matching__mistakes">
            <h4>Noto'g'ri javoblar</h4>
            {result.incorrectItems.length ? (
              <div className="vocabulary-matching__mistake-list">
                {result.incorrectItems.map((item) => (
                  <div
                    key={item.id}
                    className="vocabulary-matching__mistake-item"
                  >
                    <strong>{item.term}</strong>
                    <span>
                      Siz tanladingiz: {item.selectedKey || "-"} | To'g'ri
                      javob: {item.correctKey}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="success-text">Barcha juftliklar to'g'ri topildi.</p>
            )}
          </section>
        </div>
      ) : null}

      <div className="vocabulary-matching__actions">
        {!result ? (
          <button
            className="primary-button"
            onClick={onSubmit}
            disabled={!isComplete}
          >
            {submitLabel}
          </button>
        ) : onContinue ? (
          <button className="primary-button" onClick={onContinue}>
            {continueLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default VocabularyMatching;
