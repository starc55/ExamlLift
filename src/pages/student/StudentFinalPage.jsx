import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AudioPlayer from "../../components/audio/AudioPlayer";
import AIStatusLoader from "../../components/feedback/AIStatusLoader";
import CriteriaBreakdown from "../../components/feedback/CriteriaBreakdown";
import ErrorAlert from "../../components/feedback/ErrorAlert";
import FeedbackCard from "../../components/feedback/FeedbackCard";
import FeedbackLanguageSelector from "../../components/feedback/FeedbackLanguageSelector";
import ScoreSummary from "../../components/feedback/ScoreSummary";
import WrongAnswersList from "../../components/feedback/WrongAnswersList";
import ProgressBar from "../../components/ProgressBar";
import TestCard from "../../components/cards/TestCard";
import Timer from "../../components/Timer";
import QuestionCard from "../../components/tests/QuestionCard";
import SpeakingRecorder from "../../components/tests/SpeakingRecorder";
import { useAuth } from "../../context/AuthContext";
import {
  getOverallExamFeedback,
  getSpeakingFeedback,
  getTestFeedback,
  getWritingFeedback,
} from "../../services/ai/aiClient";
import { getSavedFeedbackLanguage } from "../../services/ai/feedbackLanguage";
import {
  buildFallbackExamFeedback,
  clearTempExamResult,
  createGroupedExamResult,
  hasAllExamSections,
  percentageToCEFR,
  saveGroupedExamResult,
  saveTempExamSection,
} from "../../services/results/resultService";
import { getTestByType } from "../../services/tests/testService";
import { areAllQuestionsAnswered, scoreMcqTest } from "../../utils/testHelpers";

function StudentFinalPage() {
  const { currentUser } = useAuth();
  const writingTest = getTestByType("writing", "final");
  const speakingTest = getTestByType("speaking", "final");
  const listeningTest = getTestByType("listening", "final");
  const readingTest = getTestByType("reading", "final");

  const steps = useMemo(
    () => [
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
    ],
    [listeningTest, readingTest, speakingTest, writingTest]
  );

  const [feedbackLanguage, setFeedbackLanguage] = useState(getSavedFeedbackLanguage);
  const [hasStarted, setHasStarted] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [writingText, setWritingText] = useState("");
  const [listeningAnswers, setListeningAnswers] = useState({});
  const [readingAnswers, setReadingAnswers] = useState({});
  const [writingAssessment, setWritingAssessment] = useState(null);
  const [speakingAssessment, setSpeakingAssessment] = useState(null);
  const [listeningResult, setListeningResult] = useState(null);
  const [readingResult, setReadingResult] = useState(null);
  const [listeningAssessment, setListeningAssessment] = useState(null);
  const [readingAssessment, setReadingAssessment] = useState(null);
  const [savedExamResult, setSavedExamResult] = useState(null);
  const [writingLoading, setWritingLoading] = useState(false);
  const [speakingLoading, setSpeakingLoading] = useState(false);
  const [listeningLoading, setListeningLoading] = useState(false);
  const [readingLoading, setReadingLoading] = useState(false);
  const [overallLoading, setOverallLoading] = useState(false);
  const [writingError, setWritingError] = useState("");
  const [speakingError, setSpeakingError] = useState("");
  const [listeningError, setListeningError] = useState("");
  const [readingError, setReadingError] = useState("");
  const [overallError, setOverallError] = useState("");
  const [writingWarning, setWritingWarning] = useState("");

  const completionPercent = Math.round((completedSteps.length / steps.length) * 100);

  const markStepComplete = (stepKey) => {
    setCompletedSteps((current) =>
      current.includes(stepKey) ? current : [...current, stepKey]
    );
  };

  const goToNextStep = () => {
    setActiveStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const saveSection = (sectionKey, sectionPayload) =>
    saveTempExamSection("final", currentUser.id, sectionKey, sectionPayload);

  const completeFinalIfReady = async (sections) => {
    if (!hasAllExamSections("final", sections) || savedExamResult) {
      return;
    }

    setOverallLoading(true);
    setOverallError("");

    const draftResult = createGroupedExamResult({
      studentId: currentUser.id,
      studentName: currentUser.fullname,
      examType: "final",
      title: "Final Exam Result",
      sections,
      feedbackLanguage,
      aiFeedback: "",
    });

    let aiFeedback = "";

    try {
      const assessment = await getOverallExamFeedback({
        examType: "final",
        feedbackLanguage,
        result: {
          overallScore: draftResult.overallScore,
          totalScore: draftResult.totalScore,
          percentage: draftResult.percentage,
          overallCEFR: draftResult.overallCEFR,
        },
        sections: draftResult.sections,
      });
      aiFeedback = assessment.feedback;
    } catch (error) {
      setOverallError(
        `${error.message} Fallback feedback bilan grouped result saqlandi.`
      );
      aiFeedback = buildFallbackExamFeedback({
        examType: "final",
        percentage: draftResult.percentage,
        overallCEFR: draftResult.overallCEFR,
        sections: draftResult.sections,
        feedbackLanguage,
      });
    }

    const saved = saveGroupedExamResult({
      studentId: currentUser.id,
      studentName: currentUser.fullname,
      examType: "final",
      title: "Final Exam Result",
      sections,
      feedbackLanguage,
      aiFeedback,
    });

    clearTempExamResult("final", currentUser.id);
    setSavedExamResult(saved);
    setOverallLoading(false);
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
        feedbackLanguage,
        taskTitle: writingTest.taskTitle || writingTest.title,
        taskPrompt: writingTest.prompt,
        answer: trimmedText,
        level: writingTest.level,
        examType: writingTest.examType,
      });
      const percentage = assessment.score;
      const score = Math.round((percentage / 100) * writingTest.score);

      saveSection("writing", {
        title: "Writing",
        score,
        totalScore: writingTest.score,
        percentage,
        cefrLevel: assessment.cefrLevel || percentageToCEFR(percentage),
        band: assessment.band,
        criteria: assessment.criteria,
        aiFeedback: assessment.feedback,
        answer: trimmedText,
      });
      setWritingAssessment(assessment);
      markStepComplete("writing");
      goToNextStep();
    } catch (error) {
      setWritingError(error.message);
    } finally {
      setWritingLoading(false);
    }
  };

  const handleSpeakingAssessment = async ({ blob, durationSeconds }) => {
    setSpeakingLoading(true);
    setSpeakingError("");

    try {
      const assessment = await getSpeakingFeedback(blob, {
        feedbackLanguage,
        durationSeconds,
        taskTitle: speakingTest.taskTitle || speakingTest.title,
        taskPrompt: speakingTest.prompt,
        level: speakingTest.level,
        examType: speakingTest.examType,
      });
      const percentage = assessment.score;
      const score = Math.round((percentage / 100) * speakingTest.score);

      saveSection("speaking", {
        title: "Speaking",
        score,
        totalScore: speakingTest.score,
        percentage,
        cefrLevel: assessment.cefrLevel || percentageToCEFR(percentage),
        band: assessment.band,
        criteria: assessment.criteria,
        aiFeedback: assessment.feedback,
        transcript: assessment.transcript,
      });
      setSpeakingAssessment(assessment);
      markStepComplete("speaking");
      goToNextStep();

      return assessment;
    } catch (error) {
      setSpeakingError(error.message);
      throw error;
    } finally {
      setSpeakingLoading(false);
    }
  };

  const handleListeningSubmit = async () => {
    if (!areAllQuestionsAnswered(listeningTest.questions, listeningAnswers)) {
      setListeningError("Barcha listening savollariga javob bering.");
      return;
    }

    const result = scoreMcqTest(listeningTest.questions, listeningAnswers, listeningTest.score);
    setListeningResult(result);
    setListeningLoading(true);
    setListeningError("");

    try {
      const assessment = await getTestFeedback({
        section: "listening",
        feedbackLanguage,
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
      });

      saveSection("listening", {
        title: "Listening",
        score: result.score,
        totalScore: result.maxScore,
        percentage: result.percentage,
        cefrLevel: assessment.cefrLevel || percentageToCEFR(result.percentage),
        band: assessment.band,
        criteria: assessment.criteria,
        aiFeedback: assessment.feedback,
        answers: listeningAnswers,
        wrongAnswers: result.wrongAnswers,
      });
      setListeningAssessment(assessment);
      markStepComplete("listening");
      goToNextStep();
    } catch (error) {
      setListeningError(error.message);
    } finally {
      setListeningLoading(false);
    }
  };

  const handleReadingSubmit = async () => {
    if (!areAllQuestionsAnswered(readingTest.questions, readingAnswers)) {
      setReadingError("Barcha reading savollariga javob bering.");
      return;
    }

    const result = scoreMcqTest(readingTest.questions, readingAnswers, readingTest.score);
    setReadingResult(result);
    setReadingLoading(true);
    setReadingError("");

    try {
      const assessment = await getTestFeedback({
        section: "reading",
        feedbackLanguage,
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
      });

      const nextTemp = saveSection("reading", {
        title: "Reading",
        score: result.score,
        totalScore: result.maxScore,
        percentage: result.percentage,
        cefrLevel: assessment.cefrLevel || percentageToCEFR(result.percentage),
        band: assessment.band,
        criteria: assessment.criteria,
        aiFeedback: assessment.feedback,
        answers: readingAnswers,
        wrongAnswers: result.wrongAnswers,
      });

      setReadingAssessment(assessment);
      markStepComplete("reading");
      await completeFinalIfReady(nextTemp.sections);
    } catch (error) {
      setReadingError(error.message);
    } finally {
      setReadingLoading(false);
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
              Writing, speaking, listening, and reading are saved temporarily.
              After reading is complete, one Final Exam Result is saved with a
              full section breakdown and AI general feedback.
            </p>
          </div>
          <FeedbackLanguageSelector
            value={feedbackLanguage}
            onChange={setFeedbackLanguage}
          />
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
              <FeedbackLanguageSelector
                value={feedbackLanguage}
                onChange={setFeedbackLanguage}
              />
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
                </div>
              </TestCard>
              {writingLoading ? <AIStatusLoader message="Writing AI feedback tayyorlanmoqda." /> : null}
              <ErrorAlert message={writingError} />
              {writingAssessment ? (
                <ScoreSummary
                  title="Writing summary"
                  score={Math.round((writingAssessment.score / 100) * writingTest.score)}
                  total={writingTest.score}
                  percentage={writingAssessment.score}
                  cefrLevel={writingAssessment.cefrLevel}
                  band={writingAssessment.band}
                />
              ) : null}
              <CriteriaBreakdown criteria={writingAssessment?.criteria} />
              <FeedbackCard title="Writing AI feedback" feedback={writingAssessment?.feedback} />
            </>
          ) : null}

          {activeStep === 1 ? (
            <>
              <TestCard
                title={speakingTest.title}
                description={speakingTest.instructions}
                stats="Fluency + vocabulary"
              >
                <SpeakingRecorder
                  title="Final speaking task"
                  prompt={speakingTest.prompt}
                  onEvaluate={handleSpeakingAssessment}
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
                  cefrLevel={speakingAssessment.cefrLevel}
                  band={speakingAssessment.band}
                />
              ) : null}
              <CriteriaBreakdown criteria={speakingAssessment?.criteria} />
              <FeedbackCard title="Speaking AI feedback" feedback={speakingAssessment?.feedback} />
            </>
          ) : null}

          {activeStep === 2 ? (
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
                  cefrLevel={listeningAssessment?.cefrLevel}
                  band={listeningAssessment?.band}
                />
              ) : null}
              <CriteriaBreakdown criteria={listeningAssessment?.criteria} />
              {listeningResult ? <WrongAnswersList items={listeningResult.wrongAnswers} /> : null}
              <FeedbackCard title="Listening AI feedback" feedback={listeningAssessment?.feedback} />
            </>
          ) : null}

          {activeStep === 3 ? (
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
                  Submit final exam
                </button>
              </TestCard>
              {readingLoading ? <AIStatusLoader message="Reading AI feedback tayyorlanmoqda." /> : null}
              {overallLoading ? <AIStatusLoader message="Final umumiy AI feedback tayyorlanmoqda." /> : null}
              <ErrorAlert message={readingError || overallError} />
              {readingResult ? (
                <ScoreSummary
                  title="Reading summary"
                  score={readingResult.score}
                  total={readingResult.maxScore}
                  percentage={readingResult.percentage}
                  cefrLevel={readingAssessment?.cefrLevel}
                  band={readingAssessment?.band}
                />
              ) : null}
              <CriteriaBreakdown criteria={readingAssessment?.criteria} />
              {readingResult ? <WrongAnswersList items={readingResult.wrongAnswers} /> : null}
              <FeedbackCard title="Reading AI feedback" feedback={readingAssessment?.feedback} />
            </>
          ) : null}

          {savedExamResult ? (
            <section className="card exam-finish">
              <p className="eyebrow">Completed</p>
              <h2>The final control is complete</h2>
              <p>
                One grouped Final Exam Result has been saved with writing,
                speaking, listening, reading, overall CEFR, and AI general
                feedback.
              </p>
              <ScoreSummary
                title="Final Exam Result"
                score={savedExamResult.overallScore}
                total={savedExamResult.totalScore}
                percentage={savedExamResult.percentage}
                cefrLevel={savedExamResult.overallCEFR}
              />
              <FeedbackCard title="AI general feedback" feedback={savedExamResult.aiFeedback} />
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
