const criteriaLabels = {
  taskAchievement: "Task Achievement / Response",
  coherenceCohesion: "Coherence and Cohesion",
  lexicalResource: "Lexical Resource",
  grammaticalRangeAccuracy: "Grammatical Range and Accuracy",
  taskResponse: "Task Response",
  coherence: "Coherence",
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  fluency: "Fluency",
  pronunciation: "Pronunciation",
  readingComprehension: "Reading Comprehension",
  detailRecognition: "Detail Recognition",
  inferenceDeduction: "Inference and Deduction",
  vocabularyInContext: "Vocabulary in Context",
  speedEfficiency: "Speed and Efficiency",
  comprehension: "Comprehension",
  detailAccuracy: "Detail Accuracy",
  inference: "Inference",
  strategy: "Strategy",
  comprehensionUnderstanding: "Comprehension / Understanding",
  inferencePrediction: "Inference and Prediction",
  speedAccuracy: "Speed and Accuracy",
  detailListening: "Detail Listening",
  keywordTracking: "Keyword Tracking",
  noteTaking: "Note Taking",
  rangeForm: "Range / Form",
  accuracy: "Accuracy",
  appropriacy: "Appropriacy",
  complexStructures: "Complex Structures",
  grammarControl: "Grammar Control",
  topicAwareness: "Topic Awareness",
  correctionSkill: "Correction Skill",
  rangeBreadth: "Range / Breadth",
  precisionAccuracy: "Precision / Accuracy",
  appropriacyContextualUse: "Appropriacy / Contextual Use",
  flexibilityParaphrasing: "Flexibility / Paraphrasing",
  meaningMatch: "Meaning Match",
  wordRecall: "Word Recall",
  precision: "Precision",
  memoryStrategy: "Memory Strategy",
  completion: "Completion",
  communication: "Communication",
  improvementReadiness: "Improvement Readiness",
  sectionBalance: "Section Balance",
  weaknessFocus: "Weakness Focus",
  learningPlan: "Learning Plan",
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
