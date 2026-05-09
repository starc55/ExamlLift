import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AudioPlayer from "../../components/audio/AudioPlayer";
import FeedbackCard from "../../components/feedback/FeedbackCard";
import ProgressBar from "../../components/ProgressBar";
import TestCard from "../../components/cards/TestCard";
import Timer from "../../components/Timer";
import QuestionCard from "../../components/tests/QuestionCard";
import SpeakingRecorder from "../../components/tests/SpeakingRecorder";
import { useAuth } from "../../context/AuthContext";
import { getListeningFeedback } from "../../services/ai/listeningFeedback";
import { getReadingFeedback } from "../../services/ai/readingFeedback";
import { getSpeakingFeedback } from "../../services/ai/speakingFeedback";
import { getWritingFeedback } from "../../services/ai/aiClient";
import { saveResult } from "../../services/results/resultService";
import { getTestByType } from "../../services/tests/testService";
import { scoreMcqTest } from "../../utils/testHelpers";

function StudentFinalPage() {
  const { currentUser } = useAuth();
  const listeningTest = getTestByType("listening", "final");
  const readingTest = getTestByType("reading", "final");
  const writingTest = getTestByType("writing", "final");
  const speakingTest = getTestByType("speaking", "final");

  const steps = useMemo(
    () => [
      {
        key: "listening",
        title: listeningTest.title,
        description: listeningTest.instructions,
      },
      {
        key: "reading",
        title: readingTest.title,
        description: readingTest.instructions,
      },
      {
        key: "writing",
        title: writingTest.title,
        description: writingTest.instructions,
      },
      {
        key: "speaking",
        title: speakingTest.title,
        description: speakingTest.instructions,
      },
    ],
    [listeningTest, readingTest, speakingTest, writingTest]
  );

  const [hasStarted, setHasStarted] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [listeningAnswers, setListeningAnswers] = useState({});
  const [readingAnswers, setReadingAnswers] = useState({});
  const [writingText, setWritingText] = useState("");
  const [listeningFeedback, setListeningFeedback] = useState("");
  const [readingFeedback, setReadingFeedback] = useState("");
  const [writingFeedback, setWritingFeedback] = useState("");
  const [speakingFeedback, setSpeakingFeedback] = useState("");
  const [writingLoading, setWritingLoading] = useState(false);
  const [writingError, setWritingError] = useState("");

  const completionPercent = Math.round((completedSteps.length / steps.length) * 100);

  const saveStudentResult = (test, result, feedback) => {
    saveResult({
      studentId: currentUser.id,
      studentName: currentUser.fullname,
      testId: test.id,
      testTitle: test.title,
      type: test.type,
      section: test.section,
      score: result.score,
      maxScore: result.maxScore,
      percent: result.percent,
      feedback,
    });
  };

  const markStepComplete = (stepKey) => {
    setCompletedSteps((current) =>
      current.includes(stepKey) ? current : [...current, stepKey]
    );
  };

  const goToNextStep = () => {
    setActiveStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const handleListeningSubmit = () => {
    const result = scoreMcqTest(listeningTest.questions, listeningAnswers, listeningTest.score);
    const feedback = getListeningFeedback({ percent: result.percent });

    setListeningFeedback(feedback);
    markStepComplete("listening");
    saveStudentResult(listeningTest, result, feedback);
    goToNextStep();
  };

  const handleReadingSubmit = () => {
    const result = scoreMcqTest(readingTest.questions, readingAnswers, readingTest.score);
    const feedback = getReadingFeedback({ percent: result.percent });

    setReadingFeedback(feedback);
    markStepComplete("reading");
    saveStudentResult(readingTest, result, feedback);
    goToNextStep();
  };

  const handleWritingReview = async () => {
    const trimmedText = writingText.trim();

    if (!trimmedText) {
      setWritingError("Iltimos, avval writing javobini kiriting.");
      setWritingFeedback("");
      return;
    }

    const wordCount = trimmedText.split(/\s+/).filter(Boolean).length;
    const percent = wordCount >= 80 ? 78 : 56;
    const score = Math.round((percent / 100) * writingTest.score);

    setWritingLoading(true);
    setWritingError("");

    try {
      const feedback = await getWritingFeedback(trimmedText);

      setWritingFeedback(feedback);
      markStepComplete("writing");
      saveStudentResult(
        writingTest,
        { score, maxScore: writingTest.score, percent },
        feedback
      );
      goToNextStep();
    } catch {
      setWritingError("AI feedback olishda xatolik yuz berdi.");
    } finally {
      setWritingLoading(false);
    }
  };

  const renderStepOverview = (step, index) => (
    <article key={step.key} className="exam-step">
      <span className="pill pill--soft">Step {index + 1}</span>
      <strong>{step.title}</strong>
      <p>{step.description}</p>
    </article>
  );

  return (
    <div className="page-stack">
      {!hasStarted ? (
        <section className="card exam-intro">
          <div>
            <p className="eyebrow">Final control</p>
            <h2>The final test begins with a guided step-by-step start</h2>
            <p>
              Listening, reading, writing, and speaking sections open one after
              another. Each response is saved as you go, and the full flow finishes
              at the end.
            </p>
          </div>
          <div className="exam-steps">{steps.map(renderStepOverview)}</div>
          <button className="primary-button card-link" onClick={() => setHasStarted(true)}>
            Start final control
          </button>
        </section>
      ) : (
        <>
          <section className="section-heading section-heading--with-tools">
            <div>
              <p className="eyebrow">Final control</p>
              <h2>Four-part guided exam flow</h2>
            </div>
            <div className="section-tools">
              <Timer initialMinutes={35} />
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
                title={listeningTest.title}
                description={listeningTest.instructions}
                stats={`${listeningTest.questions.length} questions`}
              >
                <AudioPlayer src={listeningTest.audioUrl} title="Listening material" />
                <div className="question-list">
                  {listeningTest.questions.map((question, index) => (
                    <QuestionCard
                      key={question.id}
                      index={index}
                      question={{ prompt: question.prompt, options: question.options }}
                      namePrefix="listening"
                      selectedValue={listeningAnswers[question.id]}
                      onChange={(value) =>
                        setListeningAnswers((current) => ({
                          ...current,
                          [question.id]: value,
                        }))
                      }
                    />
                  ))}
                </div>
                <button className="primary-button" onClick={handleListeningSubmit}>
                  Submit and continue
                </button>
              </TestCard>
              <FeedbackCard title="Listening AI feedback" feedback={listeningFeedback} />
            </>
          ) : null}

          {activeStep === 1 ? (
            <>
              <TestCard
                title={readingTest.title}
                description={readingTest.instructions}
                stats={`${readingTest.questions.length} questions`}
              >
                <div className="reading-passage">
                  <h4>{readingTest.passageTitle}</h4>
                  <p>{readingTest.passage}</p>
                </div>
                <div className="question-list">
                  {readingTest.questions.map((question, index) => (
                    <QuestionCard
                      key={question.id}
                      index={index}
                      question={{ prompt: question.prompt, options: question.options }}
                      namePrefix="reading"
                      selectedValue={readingAnswers[question.id]}
                      onChange={(value) =>
                        setReadingAnswers((current) => ({
                          ...current,
                          [question.id]: value,
                        }))
                      }
                    />
                  ))}
                </div>
                <button className="primary-button" onClick={handleReadingSubmit}>
                  Submit and continue
                </button>
              </TestCard>
              <FeedbackCard title="Reading AI feedback" feedback={readingFeedback} />
            </>
          ) : null}

          {activeStep === 2 ? (
            <>
              <TestCard
                title={writingTest.title}
                description={writingTest.instructions}
                stats="AI evaluation"
              >
                <div className="writing-block">
                  <p className="writing-prompt">{writingTest.prompt}</p>
                  <textarea
                    value={writingText}
                    onChange={(event) => {
                      setWritingText(event.target.value);
                      if (writingError) {
                        setWritingError("");
                      }
                    }}
                    rows={8}
                    placeholder="Write your response here..."
                  />
                  {writingError ? <p className="error-text">{writingError}</p> : null}
                  <button
                    className="primary-button"
                    onClick={handleWritingReview}
                    disabled={writingLoading}
                  >
                    {writingLoading ? "Checking with AI..." : "Evaluate and continue"}
                  </button>
                  {writingLoading ? (
                    <div className="inline-feedback">
                      <strong>AI feedback tayyorlanmoqda.</strong>
                      <p>Iltimos, biroz kuting.</p>
                    </div>
                  ) : null}
                </div>
              </TestCard>
              <FeedbackCard title="Writing AI feedback" feedback={writingFeedback} />
            </>
          ) : null}

          {activeStep === 3 ? (
            <>
              <TestCard
                title={speakingTest.title}
                description={speakingTest.instructions}
                stats="Fluency + vocabulary"
              >
                <SpeakingRecorder
                  title="Final speaking task"
                  prompt={speakingTest.prompt}
                  onEvaluate={async ({ durationSeconds }) => {
                    const feedback = getSpeakingFeedback({
                      durationSeconds,
                      context: "final",
                    });
                    const percent = durationSeconds >= 30 ? 86 : 62;
                    const score = Math.round((percent / 100) * speakingTest.score);

                    setSpeakingFeedback(feedback);
                    markStepComplete("speaking");
                    saveStudentResult(
                      speakingTest,
                      { score, maxScore: speakingTest.score, percent },
                      feedback
                    );

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
              <h2>The final control is complete</h2>
              <p>
                All section results have been saved. You can review them in the
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

export default StudentFinalPage;
