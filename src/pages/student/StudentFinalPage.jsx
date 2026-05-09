import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AudioPlayer from "../../components/audio/AudioPlayer";
import AIStatusLoader from "../../components/feedback/AIStatusLoader";
import CriteriaBreakdown from "../../components/feedback/CriteriaBreakdown";
import ErrorAlert from "../../components/feedback/ErrorAlert";
import FeedbackCard from "../../components/feedback/FeedbackCard";
import ScoreSummary from "../../components/feedback/ScoreSummary";
import WrongAnswersList from "../../components/feedback/WrongAnswersList";
import ProgressBar from "../../components/ProgressBar";
import TestCard from "../../components/cards/TestCard";
import Timer from "../../components/Timer";
import QuestionCard from "../../components/tests/QuestionCard";
import SpeakingRecorder from "../../components/tests/SpeakingRecorder";
import { useAuth } from "../../context/AuthContext";
import {
  getSpeakingFeedback,
  getTestFeedback,
  getWritingFeedback,
} from "../../services/ai/aiClient";
import { saveResult } from "../../services/results/resultService";
import { getTestByType } from "../../services/tests/testService";
import { areAllQuestionsAnswered, scoreMcqTest } from "../../utils/testHelpers";

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
  const [listeningResult, setListeningResult] = useState(null);
  const [readingResult, setReadingResult] = useState(null);
  const [listeningAssessment, setListeningAssessment] = useState(null);
  const [readingAssessment, setReadingAssessment] = useState(null);
  const [writingAssessment, setWritingAssessment] = useState(null);
  const [speakingAssessment, setSpeakingAssessment] = useState(null);
  const [listeningLoading, setListeningLoading] = useState(false);
  const [readingLoading, setReadingLoading] = useState(false);
  const [writingLoading, setWritingLoading] = useState(false);
  const [speakingLoading, setSpeakingLoading] = useState(false);
  const [listeningError, setListeningError] = useState("");
  const [readingError, setReadingError] = useState("");
  const [writingError, setWritingError] = useState("");
  const [speakingError, setSpeakingError] = useState("");
  const [writingWarning, setWritingWarning] = useState("");

  const completionPercent = Math.round((completedSteps.length / steps.length) * 100);

  const saveStudentResult = (test, result, feedback) => {
    saveResult({
      studentId: currentUser.id,
      studentName: currentUser.fullname,
      testId: test.id,
      testTitle: test.title,
      type: test.type,
      section: test.section,
      examType: test.examType,
      score: result.score,
      total: result.total ?? result.maxScore ?? 0,
      percentage: result.percentage ?? result.percent ?? 0,
      band: result.band ?? null,
      criteria: result.criteria || {},
      answers: result.answers || null,
      wrongAnswers: result.wrongAnswers || [],
      transcript: result.transcript || "",
      answer: result.answer || "",
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
    if (!areAllQuestionsAnswered(listeningTest.questions, listeningAnswers)) {
      setListeningError("Barcha listening savollariga javob bering.");
      return;
    }

    const result = scoreMcqTest(listeningTest.questions, listeningAnswers, listeningTest.score);
    setListeningResult(result);
    setListeningLoading(true);
    setListeningError("");

    getTestFeedback({
      section: "listening",
      result: {
        score: result.correctCount,
        total: result.totalQuestions,
        percentage: result.percentage,
      },
      questionData: {
        audioTitle: listeningTest.audioTitle,
        topic: listeningTest.topic,
        wrongAnswers: result.wrongAnswers,
      },
    })
      .then((assessment) => {
        setListeningAssessment(assessment);
        markStepComplete("listening");
        saveStudentResult(
          listeningTest,
          {
            score: result.score,
            total: result.maxScore,
            percentage: result.percentage,
            band: assessment.band,
            criteria: assessment.criteria,
            answers: listeningAnswers,
            wrongAnswers: result.wrongAnswers,
          },
          assessment.feedback
        );
        goToNextStep();
      })
      .catch((error) => setListeningError(error.message))
      .finally(() => setListeningLoading(false));
  };

  const handleReadingSubmit = () => {
    if (!areAllQuestionsAnswered(readingTest.questions, readingAnswers)) {
      setReadingError("Barcha reading savollariga javob bering.");
      return;
    }

    const result = scoreMcqTest(readingTest.questions, readingAnswers, readingTest.score);
    setReadingResult(result);
    setReadingLoading(true);
    setReadingError("");

    getTestFeedback({
      section: "reading",
      result: {
        score: result.correctCount,
        total: result.totalQuestions,
        percentage: result.percentage,
      },
      questionData: {
        passageTitle: readingTest.passageTitle,
        passageSummary: readingTest.passageSummary,
        wrongAnswers: result.wrongAnswers,
      },
    })
      .then((assessment) => {
        setReadingAssessment(assessment);
        markStepComplete("reading");
        saveStudentResult(
          readingTest,
          {
            score: result.score,
            total: result.maxScore,
            percentage: result.percentage,
            band: assessment.band,
            criteria: assessment.criteria,
            answers: readingAnswers,
            wrongAnswers: result.wrongAnswers,
          },
          assessment.feedback
        );
        goToNextStep();
      })
      .catch((error) => setReadingError(error.message))
      .finally(() => setReadingLoading(false));
  };

  const handleWritingReview = async () => {
    const trimmedText = writingText.trim();

    if (!trimmedText) {
      setWritingError("Iltimos, avval writing javobini kiriting.");
      setWritingAssessment(null);
      return;
    }

    const wordCount = trimmedText.split(/\s+/).filter(Boolean).length;
    setWritingWarning(
      wordCount < 50
        ? "Javob juda qisqa. Kuchli feedback uchun kamida 50 ta so'z yozish tavsiya etiladi."
        : ""
    );

    setWritingLoading(true);
    setWritingError("");

    try {
      const assessment = await getWritingFeedback({
        taskTitle: writingTest.taskTitle || writingTest.title,
        taskPrompt: writingTest.prompt,
        answer: trimmedText,
        level: writingTest.level,
        examType: writingTest.examType,
      });
      const percentage = assessment.score;
      const score = Math.round((percentage / 100) * writingTest.score);

      setWritingAssessment(assessment);
      markStepComplete("writing");
      saveStudentResult(
        writingTest,
        {
          score,
          total: writingTest.score,
          percentage,
          band: assessment.band,
          criteria: assessment.criteria,
          answer: trimmedText,
        },
        assessment.feedback
      );
      goToNextStep();
    } catch (error) {
      setWritingError(error.message);
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
                      onChange={(value) => {
                        setListeningAnswers((current) => ({
                          ...current,
                          [question.id]: value,
                        }));
                        if (listeningError) {
                          setListeningError("");
                        }
                      }}
                    />
                  ))}
                </div>
                <button className="primary-button" onClick={handleListeningSubmit}>
                  Submit and continue
                </button>
              </TestCard>
              {listeningLoading ? <AIStatusLoader message="Listening AI feedback tayyorlanmoqda." /> : null}
              <ErrorAlert message={listeningError} />
              {listeningResult ? (
                <ScoreSummary
                  title="Listening summary"
                  score={listeningResult.score}
                  total={listeningResult.maxScore}
                  percentage={listeningResult.percentage}
                  band={listeningAssessment?.band}
                />
              ) : null}
              <CriteriaBreakdown criteria={listeningAssessment?.criteria} />
              {listeningResult ? <WrongAnswersList items={listeningResult.wrongAnswers} /> : null}
              <FeedbackCard title="Listening AI feedback" feedback={listeningAssessment?.feedback} />
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
                      onChange={(value) => {
                        setReadingAnswers((current) => ({
                          ...current,
                          [question.id]: value,
                        }));
                        if (readingError) {
                          setReadingError("");
                        }
                      }}
                    />
                  ))}
                </div>
                <button className="primary-button" onClick={handleReadingSubmit}>
                  Submit and continue
                </button>
              </TestCard>
              {readingLoading ? <AIStatusLoader message="Reading AI feedback tayyorlanmoqda." /> : null}
              <ErrorAlert message={readingError} />
              {readingResult ? (
                <ScoreSummary
                  title="Reading summary"
                  score={readingResult.score}
                  total={readingResult.maxScore}
                  percentage={readingResult.percentage}
                  band={readingAssessment?.band}
                />
              ) : null}
              <CriteriaBreakdown criteria={readingAssessment?.criteria} />
              {readingResult ? <WrongAnswersList items={readingResult.wrongAnswers} /> : null}
              <FeedbackCard title="Reading AI feedback" feedback={readingAssessment?.feedback} />
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
                  {writingWarning ? <p className="error-text">{writingWarning}</p> : null}
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
              {writingAssessment ? (
                <ScoreSummary
                  title="Writing summary"
                  score={Math.round((writingAssessment.score / 100) * writingTest.score)}
                  total={writingTest.score}
                  percentage={writingAssessment.score}
                  band={writingAssessment.band}
                />
              ) : null}
              <CriteriaBreakdown criteria={writingAssessment?.criteria} />
              <FeedbackCard title="Writing AI feedback" feedback={writingAssessment?.feedback} />
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
                  onEvaluate={async ({ blob, durationSeconds }) => {
                    setSpeakingLoading(true);
                    setSpeakingError("");

                    try {
                      const assessment = await getSpeakingFeedback(blob, {
                        durationSeconds,
                        taskTitle: speakingTest.taskTitle || speakingTest.title,
                        taskPrompt: speakingTest.prompt,
                        level: speakingTest.level,
                        examType: speakingTest.examType,
                      });
                      const percentage = assessment.score;
                      const score = Math.round((percentage / 100) * speakingTest.score);

                      setSpeakingAssessment(assessment);
                      markStepComplete("speaking");
                      saveStudentResult(
                        speakingTest,
                        {
                          score,
                          total: speakingTest.score,
                          percentage,
                          band: assessment.band,
                          criteria: assessment.criteria,
                          transcript: assessment.transcript,
                        },
                        assessment.feedback
                      );

                      return assessment;
                    } catch (error) {
                      setSpeakingError(error.message);
                      throw error;
                    } finally {
                      setSpeakingLoading(false);
                    }
                  }}
                />
              </TestCard>
              {speakingLoading ? <AIStatusLoader message="Speaking AI feedback tayyorlanmoqda." /> : null}
              <ErrorAlert message={speakingError} />
              {speakingAssessment ? (
                <ScoreSummary
                  title="Speaking summary"
                  score={Math.round((speakingAssessment.score / 100) * speakingTest.score)}
                  total={speakingTest.score}
                  percentage={speakingAssessment.score}
                  band={speakingAssessment.band}
                />
              ) : null}
              <CriteriaBreakdown criteria={speakingAssessment?.criteria} />
              <FeedbackCard title="Speaking AI feedback" feedback={speakingAssessment?.feedback} />
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
