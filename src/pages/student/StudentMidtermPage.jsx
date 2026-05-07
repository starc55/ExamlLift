import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FeedbackCard from "../../components/feedback/FeedbackCard";
import ProgressBar from "../../components/ProgressBar";
import TestCard from "../../components/cards/TestCard";
import Timer from "../../components/Timer";
import QuestionCard from "../../components/tests/QuestionCard";
import SpeakingRecorder from "../../components/tests/SpeakingRecorder";
import { useAuth } from "../../context/AuthContext";
import { getGrammarFeedback } from "../../services/ai/grammarFeedback";
import { getSpeakingFeedback } from "../../services/ai/speakingFeedback";
import { getVocabularyFeedback } from "../../services/ai/vocabularyFeedback";
import { saveResult } from "../../services/results/resultService";
import { getTestByType } from "../../services/tests/testService";
import { scoreMcqTest } from "../../utils/testHelpers";

function StudentMidtermPage() {
  const { currentUser } = useAuth();
  const vocabularyTest = getTestByType("vocabulary", "midterm");
  const grammarTest = getTestByType("grammar", "midterm");
  const speakingTest = getTestByType("speaking", "midterm");

  const steps = useMemo(
    () => [
      {
        key: "vocabulary",
        title: vocabularyTest.title,
        description: vocabularyTest.instructions,
        duration: vocabularyTest.durationMinutes,
      },
      {
        key: "grammar",
        title: grammarTest.title,
        description: grammarTest.instructions,
        duration: grammarTest.durationMinutes,
      },
      {
        key: "speaking",
        title: speakingTest.title,
        description: speakingTest.instructions,
        duration: speakingTest.durationMinutes,
      },
    ],
    [grammarTest, speakingTest, vocabularyTest]
  );

  const [hasStarted, setHasStarted] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [vocabularyAnswers, setVocabularyAnswers] = useState({});
  const [grammarAnswers, setGrammarAnswers] = useState({});
  const [vocabularyFeedback, setVocabularyFeedback] = useState("");
  const [grammarFeedback, setGrammarFeedback] = useState("");
  const [speakingFeedback, setSpeakingFeedback] = useState("");

  const completionPercent = Math.round((completedSteps.length / steps.length) * 100);

  const markStepComplete = (stepKey) => {
    setCompletedSteps((current) =>
      current.includes(stepKey) ? current : [...current, stepKey]
    );
  };

  const goToNextStep = () => {
    setActiveStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const handleVocabularySubmit = () => {
    const result = scoreMcqTest(vocabularyTest.questions, vocabularyAnswers, vocabularyTest.score);
    const feedback = getVocabularyFeedback({ percent: result.percent });

    setVocabularyFeedback(feedback);
    markStepComplete("vocabulary");
    saveResult({
      studentId: currentUser.id,
      studentName: currentUser.fullname,
      testId: vocabularyTest.id,
      testTitle: vocabularyTest.title,
      type: vocabularyTest.type,
      section: vocabularyTest.section,
      score: result.score,
      maxScore: result.maxScore,
      percent: result.percent,
      feedback,
    });
    goToNextStep();
  };

  const handleGrammarSubmit = () => {
    const result = scoreMcqTest(grammarTest.questions, grammarAnswers, grammarTest.score);
    const feedback = getGrammarFeedback({ percent: result.percent });

    setGrammarFeedback(feedback);
    markStepComplete("grammar");
    saveResult({
      studentId: currentUser.id,
      studentName: currentUser.fullname,
      testId: grammarTest.id,
      testTitle: grammarTest.title,
      type: grammarTest.type,
      section: grammarTest.section,
      score: result.score,
      maxScore: result.maxScore,
      percent: result.percent,
      feedback,
    });
    goToNextStep();
  };

  const renderStepOverview = (step, index) => (
    <article key={step.key} className="exam-step">
      <span className="pill pill--soft">Step {index + 1}</span>
      <strong>{step.title}</strong>
      <p>{step.description}</p>
      <span>{step.duration} min</span>
    </article>
  );

  return (
    <div className="page-stack">
      {!hasStarted ? (
        <section className="card exam-intro">
          <div>
            <p className="eyebrow">Midterm control</p>
            <h2>The test opens section by section after you press start</h2>
            <p>
              Vocabulary, grammar, and speaking sections run step by step. As soon
              as one section is completed, the next section becomes available.
            </p>
          </div>
          <div className="exam-steps">{steps.map(renderStepOverview)}</div>
          <button className="primary-button card-link" onClick={() => setHasStarted(true)}>
            Start midterm
          </button>
        </section>
      ) : (
        <>
          <section className="section-heading section-heading--with-tools">
            <div>
              <p className="eyebrow">Midterm control</p>
              <h2>Step-by-step assessment flow</h2>
            </div>
            <div className="section-tools">
              <Timer initialMinutes={20} />
              <ProgressBar label="Completed sections" value={completionPercent} />
            </div>
          </section>

          <section className="exam-steps exam-steps--progress">
            {steps.map((step, index) => (
              <article
                key={step.key}
                className={`exam-step ${
                  activeStep === index ? "exam-step--active" : ""
                } ${completedSteps.includes(step.key) ? "exam-step--complete" : ""}`}
              >
                <span className="pill pill--soft">Step {index + 1}</span>
                <strong>{step.title}</strong>
              </article>
            ))}
          </section>

          {activeStep === 0 ? (
            <>
              <TestCard
                title={vocabularyTest.title}
                description={vocabularyTest.instructions}
                stats={`${vocabularyTest.questions.length} questions`}
              >
                <div className="question-list">
                  {vocabularyTest.questions.map((question, index) => (
                    <QuestionCard
                      key={question.id}
                      index={index}
                      question={{ prompt: question.prompt, options: question.options }}
                      namePrefix="vocabulary"
                      selectedValue={vocabularyAnswers[question.id]}
                      onChange={(value) =>
                        setVocabularyAnswers((current) => ({
                          ...current,
                          [question.id]: value,
                        }))
                      }
                    />
                  ))}
                </div>
                <button className="primary-button" onClick={handleVocabularySubmit}>
                  Submit and continue
                </button>
              </TestCard>
              <FeedbackCard title="Vocabulary AI feedback" feedback={vocabularyFeedback} />
            </>
          ) : null}

          {activeStep === 1 ? (
            <>
              <TestCard
                title={grammarTest.title}
                description={grammarTest.instructions}
                stats={`${grammarTest.questions.length} questions`}
              >
                <div className="question-list">
                  {grammarTest.questions.map((question, index) => (
                    <QuestionCard
                      key={question.id}
                      index={index}
                      question={{ prompt: question.prompt, options: question.options }}
                      namePrefix="grammar"
                      selectedValue={grammarAnswers[question.id]}
                      onChange={(value) =>
                        setGrammarAnswers((current) => ({
                          ...current,
                          [question.id]: value,
                        }))
                      }
                    />
                  ))}
                </div>
                <button className="primary-button" onClick={handleGrammarSubmit}>
                  Submit and continue
                </button>
              </TestCard>
              <FeedbackCard title="Grammar AI feedback" feedback={grammarFeedback} />
            </>
          ) : null}

          {activeStep === 2 ? (
            <>
              <TestCard
                title={speakingTest.title}
                description={speakingTest.instructions}
                stats="MediaRecorder API"
              >
                <SpeakingRecorder
                  title="Midterm speaking task"
                  prompt={speakingTest.prompt}
                  onEvaluate={async ({ durationSeconds }) => {
                    const feedback = getSpeakingFeedback({
                      durationSeconds,
                      context: "midterm",
                    });
                    const percent = durationSeconds >= 20 ? 82 : 58;
                    const score = Math.round((percent / 100) * speakingTest.score);

                    setSpeakingFeedback(feedback);
                    markStepComplete("speaking");
                    saveResult({
                      studentId: currentUser.id,
                      studentName: currentUser.fullname,
                      testId: speakingTest.id,
                      testTitle: speakingTest.title,
                      type: speakingTest.type,
                      section: speakingTest.section,
                      score,
                      maxScore: speakingTest.score,
                      percent,
                      feedback,
                    });

                    return feedback;
                  }}
                />
              </TestCard>
              <FeedbackCard title="Speaking AI feedback" feedback={speakingFeedback} />
            </>
          ) : null}

          {completedSteps.length === steps.length ? (
            <section className="card exam-finish">
              <p className="eyebrow">Completed</p>
              <h2>The midterm is complete</h2>
              <p>
                Your results have been saved. You can now review all feedback in the
                results panel.
              </p>
              <Link to="/student/results" className="primary-button card-link">
                Open results
              </Link>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

export default StudentMidtermPage;
