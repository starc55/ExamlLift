import { useEffect, useRef, useState } from "react";

function SpeakingRecorder({
  title,
  prompt,
  onEvaluate,
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
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
    setTranscript("");

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
        if (blob.size === 0) {
          setError("Audio yozuvi bo'sh. Qaytadan urinib ko'ring.");
          streamRef.current?.getTracks().forEach((track) => track.stop());
          return;
        }

        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }

        const nextAudioUrl = URL.createObjectURL(blob);
        const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));

        setAudioUrl(nextAudioUrl);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        setIsEvaluating(true);

        try {
          const result = await onEvaluate({ blob, durationSeconds });
          setTranscript(result?.transcript || "");
        } catch (evaluationError) {
          setError(evaluationError.message || "Speaking baholashda xatolik yuz berdi.");
        } finally {
          setIsEvaluating(false);
        }
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
          <button className="primary-button" onClick={startRecording} disabled={isEvaluating}>
            Start recording
          </button>
        ) : (
          <button className="danger-button" onClick={stopRecording} disabled={isEvaluating}>
            Stop recording
          </button>
        )}
      </div>
      {audioUrl ? (
        <audio controls src={audioUrl} className="audio-player__native" />
      ) : null}
      {isEvaluating ? (
        <div className="inline-feedback">
          <strong>Audio AI ga yuborildi.</strong>
          <p>Transcript va feedback tayyorlanmoqda.</p>
        </div>
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}
      {transcript ? (
        <div className="inline-feedback">
          <strong>Transcript</strong>
          <pre>{transcript}</pre>
        </div>
      ) : null}
    </div>
  );
}

export default SpeakingRecorder;
