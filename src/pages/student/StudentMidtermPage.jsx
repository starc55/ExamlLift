import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import VocabularyMatching from "../../components/tests/VocabularyMatching";
import { useAuth } from "../../context/AuthContext";
import { vocabularyMatchingData } from "../../data/tests/midtermVocabularyMatching";
import {
  getSpeakingFeedback,
  getTestFeedback,
} from "../../services/ai/aiClient";
import { saveResult } from "../../services/results/resultService";
import { getTestByType } from "../../services/tests/testService";
import {
  areAllQuestionsAnswered,
  scoreMcqTest,
  scoreVocabularyMatchingTest,
} from "../../utils/testHelpers";

function StudentMidtermPage() {
  const { currentUser } = useAuth();
  const vocabularyTest = getTestByType("vocabulary", "midterm");
  const grammarTest = getTestByType("grammar", "midterm");
  const speakingTest = getTestByType("speaking", "midterm");

  const steps = useMemo(
    () => [
      {
        key: "vocabulary",
        title: "Vocabulary",
        description: vocabularyTest.instructions,
        duration: vocabularyTest.durationMinutes,
      },
      {
        key: "grammar",
        title: "Grammar",
        description: grammarTest.instructions,
        duration: grammarTest.durationMinutes,
      },
      {
        key: "speaking",
        title: "Speaking",
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
  const [vocabularyResult, setVocabularyResult] = useState(null);
  const [vocabularyAssessment, setVocabularyAssessment] = useState(null);
  const [grammarResult, setGrammarResult] = useState(null);
  const [grammarAssessment, setGrammarAssessment] = useState(null);
  const [speakingAssessment, setSpeakingAssessment] = useState(null);
  const [vocabularyLoading, setVocabularyLoading] = useState(false);
  const [grammarLoading, setGrammarLoading] = useState(false);
  const [speakingLoading, setSpeakingLoading] = useState(false);
  const [vocabularyError, setVocabularyError] = useState("");
  const [grammarError, setGrammarError] = useState("");
  const [speakingError, setSpeakingError] = useState("");
  const vocabularyData = vocabularyTest.matchingData || vocabularyMatchingData;

  const completionPercent = Math.round((completedSteps.length / steps.length) * 100);

  const markStepComplete = (stepKey) => {
    setCompletedSteps((current) =>
      current.includes(stepKey) ? current : [...current, stepKey]
    );
  };

  const goToNextStep = () => {
    setActiveStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const handleVocabularySubmit = async () => {
    const result = scoreVocabularyMatchingTest(
      vocabularyData.words,
      vocabularyData.definitions,
      vocabularyAnswers,
      vocabularyTest.score
    );
    setVocabularyLoading(true);
    setVocabularyError("");
    setVocabularyResult(result);

    try {
      const assessment = await getTestFeedback({
        section: "vocabulary",
        result: {
          score: result.correctCount,
          total: result.totalQuestions,
          percentage: result.percentage,
        },
        questionData: {
          wrongAnswers: result.wrongAnswers,
        },
      });

      setVocabularyAssessment(assessment);
      markStepComplete("vocabulary");
      saveResult({
        studentId: currentUser.id,
        studentName: currentUser.fullname,
        testId: vocabularyTest.id,
        testTitle: vocabularyTest.title,
        type: vocabularyTest.type,
        section: vocabularyTest.section,
        examType: vocabularyTest.examType,
        score: result.score,
        total: result.maxScore,
        percentage: result.percentage,
        band: assessment.band,
        feedback: assessment.feedback,
        criteria: assessment.criteria,
        answers: vocabularyAnswers,
        wrongAnswers: result.wrongAnswers,
      });
    } catch (error) {
      setVocabularyError(error.message);
    } finally {
      setVocabularyLoading(false);
    }
  };

  const handleGrammarSubmit = async () => {
    if (!areAllQuestionsAnswered(grammarTest.questions, grammarAnswers)) {
      setGrammarError("Barcha grammar savollariga javob bering.");
      return;
    }

    const result = scoreMcqTest(grammarTest.questions, grammarAnswers, grammarTest.score);
    setGrammarResult(result);
    setGrammarLoading(true);
    setGrammarError("");

    try {
      const assessment = await getTestFeedback({
        section: "grammar",
        result: {
          score: result.correctCount,
          total: result.totalQuestions,
          percentage: result.percentage,
        },
        questionData: {
          wrongAnswers: result.wrongAnswers,
        },
      });

      setGrammarAssessment(assessment);
      markStepComplete("grammar");
      saveResult({
        studentId: currentUser.id,
        studentName: currentUser.fullname,
        testId: grammarTest.id,
        testTitle: grammarTest.title,
        type: grammarTest.type,
        section: grammarTest.section,
        examType: grammarTest.examType,
        score: result.score,
        total: result.maxScore,
        percentage: result.percentage,
        band: assessment.band,
        feedback: assessment.feedback,
        criteria: assessment.criteria,
        answers: grammarAnswers,
        wrongAnswers: result.wrongAnswers,
      });
      goToNextStep();
    } catch (error) {
      setGrammarError(error.message);
    } finally {
      setGrammarLoading(false);
    }
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
                stats={`${vocabularyData.words.length} terms`}
              >
                <VocabularyMatching
                  data={vocabularyData}
                  answers={vocabularyAnswers}
                  onAnswerChange={(wordId, value) =>
                    setVocabularyAnswers((current) => ({
                      ...current,
                      [wordId]: value,
                    }))
                  }
                  onSubmit={handleVocabularySubmit}
                  result={vocabularyResult}
                  onContinue={vocabularyAssessment ? goToNextStep : null}
                />
              </TestCard>
              {vocabularyLoading ? <AIStatusLoader message="Vocabulary AI feedback tayyorlanmoqda." /> : null}
              <ErrorAlert message={vocabularyError} />
              {vocabularyResult ? (
                <ScoreSummary
                  title="Vocabulary summary"
                  score={vocabularyResult.score}
                  total={vocabularyResult.maxScore}
                  percentage={vocabularyResult.percentage}
                  band={vocabularyAssessment?.band}
                />
              ) : null}
              <CriteriaBreakdown criteria={vocabularyAssessment?.criteria} />
              {vocabularyResult ? (
                <WrongAnswersList items={vocabularyResult.wrongAnswers} />
              ) : null}
              <FeedbackCard title="Vocabulary AI feedback" feedback={vocabularyAssessment?.feedback} />
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
                      onChange={(value) => {
                        setGrammarAnswers((current) => ({
                          ...current,
                          [question.id]: value,
                        }));
                        if (grammarError) {
                          setGrammarError("");
                        }
                      }}
                    />
                  ))}
                </div>
                <button className="primary-button" onClick={handleGrammarSubmit}>
                  Submit and continue
                </button>
              </TestCard>
              {grammarLoading ? <AIStatusLoader message="Grammar AI feedback tayyorlanmoqda." /> : null}
              <ErrorAlert message={grammarError} />
              {grammarResult ? (
                <ScoreSummary
                  title="Grammar summary"
                  score={grammarResult.score}
                  total={grammarResult.maxScore}
                  percentage={grammarResult.percentage}
                  band={grammarAssessment?.band}
                />
              ) : null}
              <CriteriaBreakdown criteria={grammarAssessment?.criteria} />
              {grammarResult ? <WrongAnswersList items={grammarResult.wrongAnswers} /> : null}
              <FeedbackCard title="Grammar AI feedback" feedback={grammarAssessment?.feedback} />
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
                      saveResult({
                        studentId: currentUser.id,
                        studentName: currentUser.fullname,
                        testId: speakingTest.id,
                        testTitle: speakingTest.title,
                        type: speakingTest.type,
                        section: speakingTest.section,
                        examType: speakingTest.examType,
                        score,
                        total: speakingTest.score,
                        percentage,
                        band: assessment.band,
                        feedback: assessment.feedback,
                        criteria: assessment.criteria,
                        transcript: assessment.transcript,
                      });

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
