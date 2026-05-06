import { useEffect, useState } from "react";

function Timer({ initialMinutes = 15 }) {
  const [secondsLeft, setSecondsLeft] = useState(initialMinutes * 60);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="timer">
      <span>Timer</span>
      <strong>
        {minutes}:{seconds}
      </strong>
    </div>
  );
}

export default Timer;
