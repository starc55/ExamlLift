function QuestionCard({
  index,
  question,
  selectedValue,
  onChange,
  namePrefix = "question"
}) {
  const getOptionValue = (option) =>
    typeof option === "string" ? option : option.key || option.value || option.text;
  const getOptionLabel = (option) => {
    if (typeof option === "string") {
      return option;
    }

    return option.key ? `${option.key}: ${option.text}` : option.text;
  };

  return (
    <article className="question-card">
      <h4>
        {index + 1}. {question.prompt}
      </h4>
      <div className="question-card__options">
        {question.options.map((option, optionIndex) => {
          const value = getOptionValue(option);

          return (
            <label key={`${value}-${optionIndex}`} className="option-row">
              <input
                type="radio"
                name={`${namePrefix}-${index}`}
                checked={selectedValue === value}
                onChange={() => onChange(value)}
              />
              <span>{getOptionLabel(option)}</span>
            </label>
          );
        })}
      </div>
    </article>
  );
}

export default QuestionCard;
