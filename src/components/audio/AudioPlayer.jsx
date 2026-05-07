function AudioPlayer({ src, title }) {
  if (!src) {
    return (
      <div className="audio-player">
        <div className="audio-player__header">
          <h4>{title}</h4>
          <span>Audio lesson</span>
        </div>
        <p className="empty-copy">Audio source has not been uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="audio-player">
      <div className="audio-player__header">
        <h4>{title}</h4>
        <span>Audio lesson</span>
      </div>
      <audio controls src={src} className="audio-player__native">
        Your browser does not support audio playback.
      </audio>
    </div>
  );
}

export default AudioPlayer;
