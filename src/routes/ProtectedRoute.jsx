import { Navigate, Outlet, useLocation } from "react-router-dom";
import LoadingScreen from "../components/LoadingScreen";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute() {
  const location = useLocation();
  const { authError, currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (authError) {
    return (
      <section className="card empty-state">
        <h3>Configuration error</h3>
        <p>{authError}</p>
      </section>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
