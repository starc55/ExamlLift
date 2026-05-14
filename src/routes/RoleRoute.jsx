import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDefaultRouteByRole } from "../constants/roles";
import LoadingScreen from "../components/LoadingScreen";

function RoleRoute({ allowedRoles }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return <Navigate to={getDefaultRouteByRole(currentUser.role)} replace />;
  }

  return <Outlet />;
}

export default RoleRoute;
