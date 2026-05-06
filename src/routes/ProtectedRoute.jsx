import { Navigate, useLocation } from "react-router-dom";
import { getActiveUser } from "../services/auth/localAuth";

function ProtectedRoute({ children }) {
  const location = useLocation();
  const user = getActiveUser();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default ProtectedRoute;
