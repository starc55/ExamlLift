function ErrorAlert({ message }) {
  if (!message) {
    return null;
  }

  return (
    <div className="card error-alert">
      <strong>Xatolik</strong>
      <p>{message}</p>
    </div>
  );
}

export default ErrorAlert;
