import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AIStatusLoader from "../../components/feedback/AIStatusLoader";
import CriteriaBreakdown from "../../components/feedback/CriteriaBreakdown";
import ErrorAlert from "../../components/feedback/ErrorAlert";
import FeedbackCard from "../../components/feedback/FeedbackCard";
import FeedbackLanguageSelector from "../../components/feedback/FeedbackLanguageSelector";
import ScoreSummary from "../../components/feedback/ScoreSummary";
import WrongAnswersList from "../../components/feedback/WrongAnswersList";
import TestCard from "../../components/cards/TestCard";
import SpeakingRecorder from "../../components/tests/SpeakingRecorder";
import { useAuth } from "../../context/AuthContext";
import { getHomeworkFeedback } from "../../services/ai/aiClient";
import { getSavedFeedbackLanguage } from "../../services/ai/feedbackLanguage";
import {
  getHomeworkById,
  getLatestHomeworkSubmission,
  scoreObjectiveHomework,
  submitHomework,
  uploadHomeworkFile,
} from "../../services/homework/homeworkService";

function buildFileHomeworkFeedback(feedbackLanguage) {
  if (feedbackLanguage === "ru") {
    return "Общая оценка:\nФайл homework принят. Этот тип задания требует проверки учителем, поэтому AI не выставляет подробную языковую оценку.\n\nУровень CEFR:\nНе определен\n\nСильные стороны:\n* Работа успешно загружена.\n\nОшибки:\n* Автоматическая языковая проверка для файла не применялась.\n\nРекомендации:\n* Убедитесь, что файл соответствует инструкции.\n\nСледующий шаг:\nДождитесь проверки учителя в разделе submissions.";
  }

  if (feedbackLanguage === "en") {
    return "Overall evaluation:\nThe file homework was submitted successfully. This task type needs teacher review, so AI does not provide a detailed language assessment.\n\nCEFR level:\nNot assessed\n\nStrengths:\n* The work was uploaded successfully.\n\nMistakes:\n* Automatic language scoring was not applied to this file.\n\nRecommendations:\n* Make sure the file follows the task instructions.\n\nNext step:\nWait for teacher review in the submissions section.";
  }

  return "Umumiy baho:\nFayl homework qabul qilindi. Bu turdagi topshiriq teacher review talab qiladi, shuning uchun AI chuqur til bahosi bermaydi.\n\nCEFR daraja:\nAniqlanmadi\n\nKuchli tomonlar:\n* Ish muvaffaqiyatli yuklandi.\n\nXatolar:\n* Fayl uchun avtomatik til baholash qo'llanilmadi.\n\nTavsiyalar:\n* Fayl topshiriq ko'rsatmasiga mosligini tekshiring.\n\nKeyingi qadam:\nTeacher review natijasini submissions bo'limida kuting.";
}

function StudentHomeworkDetailPage() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const [homework, setHomework] = useState(null);
  const [latestSubmission, setLatestSubmission] = useState(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [objectiveAnswers, setObjectiveAnswers] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [feedbackLanguage, setFeedbackLanguage] = useState(getSavedFeedbackLanguage);

  useEffect(() => {
    let isMounted = true;

    async function loadHomework() {
      setPageLoading(true);
      setError("");

      try {
        const [nextHomework, nextSubmission] = await Promise.all([
          getHomeworkById(id),
          getLatestHomeworkSubmission(id, currentUser.id),
        ]);

        if (!isMounted) {
          return;
        }

        setHomework(nextHomework);
        setLatestSubmission(nextSubmission);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setPageLoading(false);
      }
    }

    loadHomework();

    return () => {
      isMounted = false;
    };
  }, [currentUser.id, id]);

  if (pageLoading) {
    return <p className="empty-copy">Loading homework...</p>;
  }

  if (!homework) {
    return (
      <section className="card empty-state">
        <h3>Homework topilmadi</h3>
        <ErrorAlert message={error} />
        <Link to="/student/homework" className="primary-button card-link">
          Back to homework
        </Link>
      </section>
    );
  }

  const objectiveItems = homework.correctAnswers?.items || [];
  const isObjectiveHomework = [
    "grammar_homework",
    "vocabulary_homework",
    "reading_homework",
    "listening_homework",
  ].includes(homework.type);

  const persistSubmission = async (payload) => {
    const saved = await submitHomework({
      homeworkId: homework.id,
      title: homework.title,
      homeworkType: homework.type,
      studentId: currentUser.id,
      studentName: currentUser.fullname,
      teacherId: homework.createdBy,
      teacherName: homework.createdByName,
      feedbackLanguage,
      ...payload,
    });

    setLatestSubmission(saved);
    setMessage("Homework muvaffaqiyatli yuborildi.");
    return saved;
  };

  const handleWritingSubmit = async (event) => {
    event.preventDefault();
    const trimmedAnswer = textAnswer.trim();

    if (!trimmedAnswer) {
      setError("Homework javobini kiriting.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const assessment = await getHomeworkFeedback({
        homeworkType: homework.type,
        feedbackLanguage,
        taskTitle: homework.title,
        instructions: homework.instructions,
        answer: trimmedAnswer,
        level: homework.level,
        deadline: homework.deadline,
      });

      await persistSubmission({
        status: "submitted",
        score: Math.round(assessment.score),
        total: 100,
        percentage: assessment.score,
        band: assessment.band,
        cefrLevel: assessment.cefrLevel,
        feedback: assessment.feedback,
        criteria: assessment.criteria,
        answer: trimmedAnswer,
      });
      setTextAnswer("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleObjectiveSubmit = async (event) => {
    event.preventDefault();

    const allAnswered = objectiveItems.every((item, index) =>
      String(objectiveAnswers[String(item.id || index)] || "").trim()
    );

    if (!allAnswered) {
      setError("Barcha homework savollariga javob bering.");
      return;
    }

    const result = scoreObjectiveHomework(homework.correctAnswers, objectiveAnswers);
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const assessment = await getHomeworkFeedback({
        homeworkType: homework.type,
        feedbackLanguage,
        taskTitle: homework.title,
        instructions: homework.instructions,
        level: homework.level,
        deadline: homework.deadline,
        result,
        questionData: {
          wrongAnswers: result.wrongAnswers,
        },
        answers: objectiveAnswers,
      });

      await persistSubmission({
        status: "submitted",
        score: result.score,
        total: result.total,
        percentage: result.percentage,
        band: assessment.band,
        cefrLevel: assessment.cefrLevel,
        feedback: assessment.feedback,
        criteria: assessment.criteria,
        answers: objectiveAnswers,
        wrongAnswers: result.wrongAnswers,
      });
      setObjectiveAnswers({});
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSubmit = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setError("Fayl tanlang.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const fileUrl = await uploadHomeworkFile(selectedFile);
      await persistSubmission({
        status: "submitted",
        score: 0,
        total: 0,
        percentage: 0,
        band: null,
        feedback: buildFileHomeworkFeedback(feedbackLanguage),
        criteria: {},
        fileName,
        fileUrl,
      });
      setSelectedFile(null);
      setFileName("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <Link to="/student/homework" className="text-link">
        Back to homework
      </Link>

      <TestCard
        title={homework.title}
        description={homework.instructions}
        stats={`${homework.type} | ${homework.level} | Due ${homework.deadline || "-"}`}
      >
        <FeedbackLanguageSelector
          value={feedbackLanguage}
          onChange={setFeedbackLanguage}
        />

        {homework.type === "writing_homework" ? (
          <form className="assignment-form" onSubmit={handleWritingSubmit}>
            <textarea
              rows={8}
              value={textAnswer}
              onChange={(event) => setTextAnswer(event.target.value)}
              placeholder="Homework javobingizni shu yerga yozing."
            />
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Yuborilmoqda..." : "Submit homework"}
            </button>
          </form>
        ) : null}

        {isObjectiveHomework ? (
          <form className="assignment-form" onSubmit={handleObjectiveSubmit}>
            {objectiveItems.map((item, index) => {
              const key = String(item.id || index);

              return (
                <label key={key}>
                  {item.prompt || item.term || `Item ${index + 1}`}
                  <input
                    value={objectiveAnswers[key] || ""}
                    onChange={(event) =>
                      setObjectiveAnswers((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    placeholder="Javobingizni kiriting"
                  />
                </label>
              );
            })}
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Tekshirilmoqda..." : "Check homework"}
            </button>
          </form>
        ) : null}

        {homework.type === "speaking_homework" ? (
          <SpeakingRecorder
            title="Speaking homework"
            prompt={homework.instructions}
            onEvaluate={async ({ blob, durationSeconds }) => {
              setLoading(true);
              setError("");
              setMessage("");

              try {
                const assessment = await getHomeworkFeedback({
                  homeworkType: homework.type,
                  feedbackLanguage,
                  audioBlob: blob,
                  durationSeconds,
                  taskTitle: homework.title,
                  instructions: homework.instructions,
                  level: homework.level,
                  deadline: homework.deadline,
                });
                const audioFile = new File([blob], `speaking-homework-${Date.now()}.webm`, {
                  type: blob.type || "audio/webm",
                });
                const audioUrl = await uploadHomeworkFile(audioFile, "homework-audio");

                await persistSubmission({
                  status: "submitted",
                  score: Math.round(assessment.score),
                  total: 100,
                  percentage: assessment.score,
                  band: assessment.band,
                  cefrLevel: assessment.cefrLevel,
                  feedback: assessment.feedback,
                  criteria: assessment.criteria,
                  transcript: assessment.transcript,
                  audioUrl,
                });

                return assessment;
              } catch (requestError) {
                setError(requestError.message);
                throw requestError;
              } finally {
                setLoading(false);
              }
            }}
          />
        ) : null}

        {homework.type === "file_homework" ? (
          <form className="assignment-form" onSubmit={handleFileSubmit}>
            <div className="file-field">
              <span>Upload file homework</span>
              <input
                className="file-field__input"
                id="homework-file-upload"
                type="file"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] || null;
                  setSelectedFile(nextFile);
                  setFileName(nextFile?.name || "");
                }}
              />
              <div className="file-field__row">
                <label htmlFor="homework-file-upload" className="file-field__trigger">
                  Choose file
                </label>
                <strong className="file-field__name">{fileName || "No file selected"}</strong>
              </div>
            </div>
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Yuborilmoqda..." : "Upload for teacher review"}
            </button>
          </form>
        ) : null}
      </TestCard>

      {loading ? <AIStatusLoader message="Homework feedback tayyorlanmoqda." /> : null}
      <ErrorAlert message={error} />
      {message ? <p className="success-text">{message}</p> : null}

      {latestSubmission ? (
        <>
          <ScoreSummary
            title="Latest homework result"
            score={latestSubmission.score}
            total={latestSubmission.total}
            percentage={latestSubmission.percentage}
            band={latestSubmission.band}
          />
          <CriteriaBreakdown criteria={latestSubmission.criteria} />
          <WrongAnswersList items={latestSubmission.wrongAnswers} emptyText="Noto'g'ri javoblar yo'q." />
          <FeedbackCard title="Homework AI feedback" feedback={latestSubmission.feedback} />
        </>
      ) : null}
    </div>
  );
}

export default StudentHomeworkDetailPage;
