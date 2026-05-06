import { useEffect, useState } from "react";
import LoadingScreen from "./components/LoadingScreen";
import AppRouter from "./routes/AppRouter";

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, 1100);

    return () => window.clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <AppRouter />;
}

export default App;
