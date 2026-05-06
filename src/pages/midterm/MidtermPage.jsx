import { useMemo, useState } from "react";
import TestCard from "../../components/cards/TestCard";
import QuestionCard from "../../components/tests/QuestionCard";
import FeedbackCard from "../../components/feedback/FeedbackCard";
import ProgressBar from "../../components/ProgressBar";
import Timer from "../../components/Timer";
import SpeakingRecorder from "../../components/tests/SpeakingRecorder";
import midtermData from "../../data/tests/midterm.json";
import { getVocabularyFeedback } from "../../services/ai/vocabularyFeedback";
import { getGrammarFeedback } from "../../services/ai/grammarFeedback";
import { getSpeakingFeedback } from "../../services/ai/speakingFeedback";

function scoreAnswers(questions, answers) {
  const correctCount = questions.reduce((total, question, index) => {
    return total + (answers[index] === question.answer ? 1 : 0);
  }, 0);

  return {
    score: correctCount,
    total: questions.length,
    percent: Math.round((correctCount / questions.length) * 100)
  };
}

function MidtermPage() {
  const [vocabularyAnswers, setVocabularyAnswers] = useState({});
  const [grammarAnswers, setGrammarAnswers] = useState({});
  const [vocabularyResult, setVocabularyResult] = useState(null);
  const [grammarResult, setGrammarResult] = useState(null);
  const [speakingDone, setSpeakingDone] = useState(false);

  const completedSections = useMemo(() => {
    return [vocabularyResult, grammarResult, speakingDone].filter(Boolean).length;
  }, [grammarResult, speakingDone, vocabularyResult]);

  const completionPercent = Math.round((completedSections / 3) * 100);

  const handleVocabularySubmit = () => {
    const result = scoreAnswers(midtermData.vocabulary, vocabularyAnswers);
    setVocabularyResult({
      ...result,
      feedback: getVocabularyFeedback(result)
    });
  };

  const handleGrammarSubmit = () => {
    const result = scoreAnswers(midtermData.grammar, grammarAnswers);
    setGrammarResult({
      ...result,
      feedback: getGrammarFeedback(result)
    });
  };

  return (
    <div className="page-stack">
      <section className="section-heading section-heading--with-tools">
        <div>
          <p className="eyebrow">Midterm assessment</p>
          <h2>Vocabulary, grammar, and speaking in one guided flow</h2>
        </div>
        <div className="section-tools">
          <Timer initialMinutes={18} />
          <ProgressBar label="Completed sections" value={completionPercent} />
        </div>
      </section>

      <TestCard
        title="1. Vocabulary Test"
        description="Multiple-choice format with automatic scoring."
        stats={`${midtermData.vocabulary.length} questions`}
      >
        <div className="question-list">
          {midtermData.vocabulary.map((question, index) => (
            <QuestionCard
              key={question.id}
              index={index}
              question={question}
              namePrefix="vocabulary"
              selectedValue={vocabularyAnswers[index]}
              onChange={(value) =>
                setVocabularyAnswers((current) => ({ ...current, [index]: value }))
              }
            />
          ))}
        </div>
        <div className="card-actions">
          <button className="primary-button" onClick={handleVocabularySubmit}>
            Check vocabulary score
          </button>
          {vocabularyResult ? (
            <span className="pill">
              {vocabularyResult.score}/{vocabularyResult.total}
            </span>
          ) : null}
        </div>
      </TestCard>
      <FeedbackCard
        title="Vocabulary AI Feedback"
        feedback={vocabularyResult?.feedback}
      />

      <TestCard
        title="2. Grammar Test"
        description="A quick assessment of grammar accuracy."
        stats={`${midtermData.grammar.length} questions`}
      >
        <div className="question-list">
          {midtermData.grammar.map((question, index) => (
            <QuestionCard
              key={question.id}
              index={index}
              question={question}
              namePrefix="grammar"
              selectedValue={grammarAnswers[index]}
              onChange={(value) =>
                setGrammarAnswers((current) => ({ ...current, [index]: value }))
              }
            />
          ))}
        </div>
        <div className="card-actions">
          <button className="primary-button" onClick={handleGrammarSubmit}>
            Check grammar score
          </button>
          {grammarResult ? (
            <span className="pill">
              {grammarResult.score}/{grammarResult.total}
            </span>
          ) : null}
        </div>
      </TestCard>
      <FeedbackCard title="Grammar AI Feedback" feedback={grammarResult?.feedback} />

      <TestCard
        title="3. Speaking Test"
        description="Use the browser microphone and receive short AI-style feedback."
        stats="MediaRecorder API"
      >
        <SpeakingRecorder
          title="Speaking practice prompt"
          prompt={midtermData.speaking.prompt}
          onEvaluate={async ({ durationSeconds }) => {
            setSpeakingDone(true);
            return getSpeakingFeedback({ durationSeconds, context: "midterm" });
          }}
        />
      </TestCard>
    </div>
  );
}

export default MidtermPage;
