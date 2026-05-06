import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "../components/layout/Layout";
import ProtectedRoute from "./ProtectedRoute";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import ContentListPage from "../pages/content/ContentListPage";
import ContentDetailPage from "../pages/content/ContentDetailPage";
import MidtermPage from "../pages/midterm/MidtermPage";
import FinalPage from "../pages/final/FinalPage";

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/content"
          element={
            <ProtectedRoute>
              <Layout>
                <ContentListPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/content/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <ContentDetailPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/midterm"
          element={
            <ProtectedRoute>
              <Layout>
                <MidtermPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/final"
          element={
            <ProtectedRoute>
              <Layout>
                <FinalPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
