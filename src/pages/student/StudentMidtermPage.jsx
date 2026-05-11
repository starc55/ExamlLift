import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import VocabularyMatching from "../../components/tests/VocabularyMatching";
import { useAuth } from "../../context/AuthContext";
import { vocabularyMatchingData } from "../../data/tests/midtermVocabularyMatching";
import {
  getOverallExamFeedback,
  getSpeakingFeedback,
  getTestFeedback,
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
import {
  areAllQuestionsAnswered,
  areAllVocabularyAnswersSelected,
  scoreMcqTest,
  scoreVocabularyMatchingTest,
} from "../../utils/testHelpers";

function StudentMidtermPage() {
  const { currentUser } = useAuth();
  const vocabularyTest = getTestByType("vocabulary", "midterm");
  const grammarTest = getTestByType("grammar", "midterm");
  const speakingTest = getTestByType("speaking", "midterm");
  const vocabularyData = vocabularyTest.matchingData || vocabularyMatchingData;

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

  const [feedbackLanguage, setFeedbackLanguage] = useState(getSavedFeedbackLanguage);
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
  const [savedExamResult, setSavedExamResult] = useState(null);
  const [vocabularyLoading, setVocabularyLoading] = useState(false);
  const [grammarLoading, setGrammarLoading] = useState(false);
  const [speakingLoading, setSpeakingLoading] = useState(false);
  const [overallLoading, setOverallLoading] = useState(false);
  const [vocabularyError, setVocabularyError] = useState("");
  const [grammarError, setGrammarError] = useState("");
  const [speakingError, setSpeakingError] = useState("");
  const [overallError, setOverallError] = useState("");

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
    saveTempExamSection("midterm", currentUser.id, sectionKey, sectionPayload);

  const completeMidtermIfReady = async (sections) => {
    if (!hasAllExamSections("midterm", sections) || savedExamResult) {
      return;
    }

    setOverallLoading(true);
    setOverallError("");

    const draftResult = createGroupedExamResult({
      studentId: currentUser.id,
      studentName: currentUser.fullname,
      examType: "midterm",
      title: "Midterm Control Result",
      sections,
      feedbackLanguage,
      aiFeedback: "",
    });

    let aiFeedback = "";

    try {
      const assessment = await getOverallExamFeedback({
        examType: "midterm",
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
        examType: "midterm",
        percentage: draftResult.percentage,
        overallCEFR: draftResult.overallCEFR,
        sections: draftResult.sections,
        feedbackLanguage,
      });
    }

    const saved = saveGroupedExamResult({
      studentId: currentUser.id,
      studentName: currentUser.fullname,
      examType: "midterm",
      title: "Midterm Control Result",
      sections,
      feedbackLanguage,
      aiFeedback,
    });

    clearTempExamResult("midterm", currentUser.id);
    setSavedExamResult(saved);
    setOverallLoading(false);
  };

  const handleVocabularySubmit = async () => {
    if (!areAllVocabularyAnswersSelected(vocabularyData.words, vocabularyAnswers)) {
      setVocabularyError("Barcha vocabulary juftliklarini tanlang.");
      return;
    }

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
        feedbackLanguage,
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
      saveSection("vocabulary", {
        title: "Vocabulary",
        score: result.score,
        totalScore: result.maxScore,
        percentage: result.percentage,
        cefrLevel: assessment.cefrLevel || percentageToCEFR(result.percentage),
        band: assessment.band,
        criteria: assessment.criteria,
        aiFeedback: assessment.feedback,
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
        feedbackLanguage,
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
      saveSection("grammar", {
        title: "Grammar",
        score: result.score,
        totalScore: result.maxScore,
        percentage: result.percentage,
        cefrLevel: assessment.cefrLevel || percentageToCEFR(result.percentage),
        band: assessment.band,
        criteria: assessment.criteria,
        aiFeedback: assessment.feedback,
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
      const nextTemp = saveSection("speaking", {
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
      await completeMidtermIfReady(nextTemp.sections);

      return assessment;
    } catch (error) {
      setSpeakingError(error.message);
      throw error;
    } finally {
      setSpeakingLoading(false);
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
              Vocabulary, grammar, and speaking are saved temporarily while you
              work. After the last section, one grouped Midterm Control Result is
              created with overall CEFR feedback.
            </p>
          </div>
          <FeedbackLanguageSelector
            value={feedbackLanguage}
            onChange={setFeedbackLanguage}
          />
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
              <FeedbackLanguageSelector
                value={feedbackLanguage}
                onChange={setFeedbackLanguage}
              />
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
                  cefrLevel={vocabularyAssessment?.cefrLevel}
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
                  cefrLevel={grammarAssessment?.cefrLevel}
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
                  onEvaluate={handleSpeakingAssessment}
                />
              </TestCard>
              {speakingLoading ? <AIStatusLoader message="Speaking AI feedback tayyorlanmoqda." /> : null}
              {overallLoading ? <AIStatusLoader message="Midterm umumiy AI feedback tayyorlanmoqda." /> : null}
              <ErrorAlert message={speakingError || overallError} />
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

          {savedExamResult ? (
            <section className="card exam-finish">
              <p className="eyebrow">Completed</p>
              <h2>The midterm is complete</h2>
              <p>
                One grouped Midterm Control Result has been saved with vocabulary,
                grammar, speaking, overall CEFR, and AI general feedback.
              </p>
              <ScoreSummary
                title="Midterm Result"
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

export default StudentMidtermPage;
