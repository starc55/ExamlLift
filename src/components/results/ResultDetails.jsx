import CriteriaBreakdown from "../feedback/CriteriaBreakdown";
import FeedbackCard from "../feedback/FeedbackCard";
import ScoreSummary from "../feedback/ScoreSummary";
import WrongAnswersList from "../feedback/WrongAnswersList";

function ResultDetails({ result }) {
  if (!result) {
    return null;
  }

  const sections = Object.entries(result.sections || {});

  return (
    <div className="modal-card__content">
      <ScoreSummary
        title="Overall assessment"
        score={result.overallScore ?? result.score}
        total={result.totalScore || result.total || result.maxScore}
        percentage={result.percentage || result.percent}
        cefrLevel={result.overallCEFR || result.cefrLevel}
        band={result.band}
      />
      <FeedbackCard title="AI general feedback" feedback={result.aiFeedback || result.feedback} />

      {sections.length ? (
        <section className="card section-breakdown-card">
          <div className="feedback-card__header">
            <h3>Section breakdown</h3>
            <span className="pill pill--soft">{sections.length} sections</span>
          </div>
          <div className="section-breakdown-list">
            {sections.map(([sectionKey, section]) => (
              <article key={sectionKey} className="section-breakdown-item">
                <ScoreSummary
                  title={section.title || sectionKey}
                  score={section.score}
                  total={section.totalScore || section.total || section.maxScore}
                  percentage={section.percentage || section.percent}
                  cefrLevel={section.cefrLevel}
                  band={section.band}
                />
                <CriteriaBreakdown criteria={section.criteria} />
                <WrongAnswersList
                  items={section.wrongAnswers}
                  emptyText="No wrong answers were stored for this section."
                />
                <FeedbackCard title={`${section.title || sectionKey} AI feedback`} feedback={section.aiFeedback || section.feedback} />
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default ResultDetails;
