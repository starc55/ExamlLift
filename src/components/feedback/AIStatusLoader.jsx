function AIStatusLoader({ message = "AI feedback tayyorlanmoqda." }) {
  return (
    <div className="card ai-status-loader">
      <div className="ai-status-loader__pulse" />
      <div>
        <strong>{message}</strong>
        <p>Iltimos, biroz kuting.</p>
      </div>
    </div>
  );
}

export default AIStatusLoader;
