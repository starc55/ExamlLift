import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { getDefaultRouteByRole, ROLES } from "../constants/roles";
import { useAuth } from "../context/AuthContext";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import StudentContentDetailPage from "../pages/student/StudentContentDetailPage";
import StudentContentPage from "../pages/student/StudentContentPage";
import StudentDashboardPage from "../pages/student/StudentDashboardPage";
import StudentFinalPage from "../pages/student/StudentFinalPage";
import StudentMidtermPage from "../pages/student/StudentMidtermPage";
import StudentProfilePage from "../pages/student/StudentProfilePage";
import StudentResultsPage from "../pages/student/StudentResultsPage";
import TeacherAnalyticsPage from "../pages/teacher/TeacherAnalyticsPage";
import TeacherDashboardPage from "../pages/teacher/TeacherDashboardPage";
import TeacherManageTestsPage from "../pages/teacher/TeacherManageTestsPage";
import TeacherProfilePage from "../pages/teacher/TeacherProfilePage";
import TeacherResultsPage from "../pages/teacher/TeacherResultsPage";
import TeacherUploadContentPage from "../pages/teacher/TeacherUploadContentPage";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";

function RootRedirect() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDefaultRouteByRole(currentUser.role)} replace />;
}

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allowedRoles={[ROLES.STUDENT]} />}>
            <Route path="/student" element={<Layout />}>
              <Route path="dashboard" element={<StudentDashboardPage />} />
              <Route path="content" element={<StudentContentPage />} />
              <Route path="content/:id" element={<StudentContentDetailPage />} />
              <Route path="midterm" element={<StudentMidtermPage />} />
              <Route path="final" element={<StudentFinalPage />} />
              <Route path="results" element={<StudentResultsPage />} />
              <Route path="profile" element={<StudentProfilePage />} />
            </Route>
          </Route>

          <Route element={<RoleRoute allowedRoles={[ROLES.TEACHER]} />}>
            <Route path="/teacher" element={<Layout />}>
              <Route path="dashboard" element={<TeacherDashboardPage />} />
              <Route path="upload-content" element={<TeacherUploadContentPage />} />
              <Route path="manage-tests" element={<TeacherManageTestsPage />} />
              <Route path="results" element={<TeacherResultsPage />} />
              <Route path="analytics" element={<TeacherAnalyticsPage />} />
              <Route path="profile" element={<TeacherProfilePage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
