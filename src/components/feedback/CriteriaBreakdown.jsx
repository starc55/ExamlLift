const criteriaLabels = {
  taskResponse: "Task Response",
  coherence: "Coherence",
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  fluency: "Fluency",
  pronunciation: "Pronunciation",
  comprehension: "Comprehension",
  detailAccuracy: "Detail Accuracy",
  inference: "Inference",
  strategy: "Strategy",
  detailListening: "Detail Listening",
  keywordTracking: "Keyword Tracking",
  noteTaking: "Note Taking",
  accuracy: "Accuracy",
  grammarControl: "Grammar Control",
  topicAwareness: "Topic Awareness",
  correctionSkill: "Correction Skill",
  meaningMatch: "Meaning Match",
  wordRecall: "Word Recall",
  precision: "Precision",
  memoryStrategy: "Memory Strategy",
  completion: "Completion",
  communication: "Communication",
  improvementReadiness: "Improvement Readiness",
};

function CriteriaBreakdown({ criteria }) {
  if (!criteria || !Object.keys(criteria).length) {
    return null;
  }

  return (
    <section className="card criteria-breakdown">
      <div className="feedback-card__header">
        <h3>Criteria Breakdown</h3>
        <span className="pill pill--soft">AI criteria</span>
      </div>
      <div className="criteria-breakdown__grid">
        {Object.entries(criteria).map(([key, value]) => (
          <div key={key} className="criteria-breakdown__item">
            <strong>{value}</strong>
            <span>{criteriaLabels[key] || key}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default CriteriaBreakdown;
