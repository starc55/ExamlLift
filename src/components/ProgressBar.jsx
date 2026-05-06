function ProgressBar({ label, value }) {
  return (
    <div className="progress">
      <div className="progress__label">
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="progress__track">
        <div className="progress__fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default ProgressBar;
