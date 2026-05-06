function QuestionCard({
  index,
  question,
  selectedValue,
  onChange,
  namePrefix = "question"
}) {
  return (
    <article className="question-card">
      <h4>
        {index + 1}. {question.prompt}
      </h4>
      <div className="question-card__options">
        {question.options.map((option) => (
          <label key={option} className="option-row">
            <input
              type="radio"
              name={`${namePrefix}-${index}`}
              checked={selectedValue === option}
              onChange={() => onChange(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </article>
  );
}

export default QuestionCard;
