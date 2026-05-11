import {
  FEEDBACK_LANGUAGE_OPTIONS,
  saveFeedbackLanguage,
} from "../../services/ai/feedbackLanguage";

function FeedbackLanguageSelector({ value, onChange }) {
  const handleChange = (event) => {
    const language = saveFeedbackLanguage(event.target.value);
    onChange?.(language);
  };

  return (
    <label className="language-selector">
      <span>Feedback language</span>
      <select value={value} onChange={handleChange}>
        {FEEDBACK_LANGUAGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default FeedbackLanguageSelector;
