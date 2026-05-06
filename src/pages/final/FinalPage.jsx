import { useState } from "react";
import AudioPlayer from "../../components/audio/AudioPlayer";
import FeedbackCard from "../../components/feedback/FeedbackCard";
import TestCard from "../../components/cards/TestCard";
import QuestionCard from "../../components/tests/QuestionCard";
import SpeakingRecorder from "../../components/tests/SpeakingRecorder";
import Timer from "../../components/Timer";
import finalData from "../../data/tests/final.json";
import { contentAssets } from "../../assets/content/assetRegistry";
import { getListeningFeedback } from "../../services/ai/listeningFeedback";
import { getReadingFeedback } from "../../services/ai/readingFeedback";
import { getSpeakingFeedback } from "../../services/ai/speakingFeedback";
import { getWritingFeedback } from "../../services/ai/writingFeedback";

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

function FinalPage() {
  const [listeningAnswers, setListeningAnswers] = useState({});
  const [readingAnswers, setReadingAnswers] = useState({});
  const [writingText, setWritingText] = useState("");
  const [listeningFeedback, setListeningFeedback] = useState("");
  const [readingFeedback, setReadingFeedback] = useState("");
  const [writingFeedback, setWritingFeedback] = useState("");
  const [listeningScore, setListeningScore] = useState("");
  const [readingScore, setReadingScore] = useState("");

  const listeningAudio = contentAssets.audio[finalData.listening.audioKey];

  const handleListeningSubmit = () => {
    const result = scoreAnswers(finalData.listening.questions, listeningAnswers);
    setListeningScore(`${result.score}/${result.total}`);
    setListeningFeedback(getListeningFeedback(result));
  };

  const handleReadingSubmit = () => {
    const result = scoreAnswers(finalData.reading.questions, readingAnswers);
    setReadingScore(`${result.score}/${result.total}`);
    setReadingFeedback(getReadingFeedback(result));
  };

  const handleWritingReview = () => {
    setWritingFeedback(getWritingFeedback({ text: writingText }));
  };

  return (
    <div className="page-stack">
      <section className="section-heading section-heading--with-tools">
        <div>
          <p className="eyebrow">Final assessment</p>
          <h2>Writing, speaking, listening and reading with mock AI evaluation</h2>
        </div>
        <Timer initialMinutes={35} />
      </section>

      <TestCard
        title="Listening"
        description="Play the audio and answer the questions."
        stats={listeningScore || `${finalData.listening.questions.length} questions`}
      >
        <AudioPlayer src={listeningAudio} title="Listening audio" />
        <div className="question-list">
          {finalData.listening.questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              index={index}
              question={question}
              namePrefix="listening"
              selectedValue={listeningAnswers[index]}
              onChange={(value) =>
                setListeningAnswers((current) => ({ ...current, [index]: value }))
              }
            />
          ))}
        </div>
        <button className="primary-button" onClick={handleListeningSubmit}>
          Submit listening
        </button>
      </TestCard>
      <FeedbackCard title="Listening AI Feedback" feedback={listeningFeedback} />

      <TestCard
        title="Reading"
        description="Read the passage and answer the questions."
        stats={readingScore || `${finalData.reading.questions.length} questions`}
      >
        <div className="reading-passage">
          <h4>{finalData.reading.title}</h4>
          <p>{finalData.reading.passage}</p>
        </div>
        <div className="question-list">
          {finalData.reading.questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              index={index}
              question={question}
              namePrefix="reading"
              selectedValue={readingAnswers[index]}
              onChange={(value) =>
                setReadingAnswers((current) => ({ ...current, [index]: value }))
              }
            />
          ))}
        </div>
        <button className="primary-button" onClick={handleReadingSubmit}>
          Submit reading
        </button>
      </TestCard>
      <FeedbackCard title="Reading AI Feedback" feedback={readingFeedback} />

      <TestCard
        title="Writing"
        description="Write a compact response and receive AI-style feedback."
        stats="Grammar, coherence, vocabulary"
      >
        <div className="writing-block">
          <p className="writing-prompt">{finalData.writing.prompt}</p>
          <textarea
            value={writingText}
            onChange={(event) => setWritingText(event.target.value)}
            placeholder="Write your response here..."
            rows={8}
          />
          <button className="primary-button" onClick={handleWritingReview}>
            Get writing feedback
          </button>
        </div>
      </TestCard>
      <FeedbackCard title="Writing AI Feedback" feedback={writingFeedback} />

      <TestCard
        title="Speaking"
        description="Record your answer and receive short band-oriented feedback."
        stats="Pronunciation, grammar, fluency, vocabulary"
      >
        <SpeakingRecorder
          title="Final speaking prompt"
          prompt={finalData.speaking.prompt}
          onEvaluate={async ({ durationSeconds }) =>
            getSpeakingFeedback({ durationSeconds, context: "final" })
          }
        />
      </TestCard>
    </div>
  );
}

export default FinalPage;
