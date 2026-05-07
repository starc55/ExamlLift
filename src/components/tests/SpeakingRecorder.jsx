import { useEffect, useRef, useState } from "react";

function SpeakingRecorder({
  title,
  prompt,
  feedbackLabel = "Speaking Feedback",
  onEvaluate,
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setError("");
    setFeedback("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser does not support the MediaRecorder API.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      startedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const nextAudioUrl = URL.createObjectURL(blob);
        const durationSeconds = Math.max(
          5,
          Math.round((Date.now() - startedAtRef.current) / 1000)
        );

        setAudioUrl(nextAudioUrl);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        setFeedback(await onEvaluate({ blob, durationSeconds }));
      };

      recorder.start();
      setIsRecording(true);
    } catch (recordingError) {
      setError("Microphone access was denied or recording is not supported.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div className="speaking-recorder">
      <div className="speaking-recorder__header">
        <div>
          <h4>{title}</h4>
          <p>{prompt}</p>
        </div>
        <span className={`status-dot ${isRecording ? "status-dot--live" : ""}`}>
          {isRecording ? "Recording" : "Ready"}
        </span>
      </div>
      <div className="speaking-recorder__actions">
        {!isRecording ? (
          <button className="primary-button" onClick={startRecording}>
            Start recording
          </button>
        ) : (
          <button className="danger-button" onClick={stopRecording}>
            Stop recording
          </button>
        )}
      </div>
      {audioUrl ? (
        <audio controls src={audioUrl} className="audio-player__native" />
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}
      {feedback ? (
        <div className="inline-feedback">
          <strong>{feedbackLabel}</strong>
          <pre>{feedback}</pre>
        </div>
      ) : null}
    </div>
  );
}

export default SpeakingRecorder;
