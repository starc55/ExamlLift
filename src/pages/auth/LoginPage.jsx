import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import BrandLogo from "../../components/BrandLogo";
import { getDefaultRouteByRole } from "../../constants/roles";
import { useAuth } from "../../context/AuthContext";

function LoginPage() {
  const { currentUser, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (currentUser) {
    return <Navigate to={getDefaultRouteByRole(currentUser.role)} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const user = await login(form);
      navigate(location.state?.from || getDefaultRouteByRole(user.role), {
        replace: true,
      });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-card auth-card--wide">
        <div className="auth-brand">
          <BrandLogo className="auth-brand__logo" alt="BluePeak English logo" />
          <div>
            <p className="eyebrow">Role-based English platform</p>
            <h1>Welcome</h1>
          </div>
        </div>
        <p className="auth-intro">
          Sign in with your account to access the student or teacher panel. Demo
          login credentials are available below.
        </p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((value) => ({ ...value, email: event.target.value }))
              }
              placeholder="teacher@example.com"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((value) => ({ ...value, password: event.target.value }))
              }
              placeholder="Minimum 6 characters"
              required
            />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button
            className="primary-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="demo-credentials">
          <div className="demo-credentials__card">
            <strong>Student demo</strong>
            <span>student@example.com</span>
            <span>student123</span>
          </div>
          <div className="demo-credentials__card">
            <strong>Teacher demo</strong>
            <span>teacher@example.com</span>
            <span>teacher123</span>
          </div>
        </div>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </section>
    </div>
  );
}

export default LoginPage;
