function AudioPlayer({ src, title }) {
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
