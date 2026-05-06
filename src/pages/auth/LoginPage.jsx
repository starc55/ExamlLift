import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import BrandLogo from "../../components/BrandLogo";
import { getActiveUser, loginUser } from "../../services/auth/localAuth";

function LoginPage() {
  const user = getActiveUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = (event) => {
    event.preventDefault();

    try {
      loginUser(form.email, form.password);
      navigate(location.state?.from || "/dashboard");
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <BrandLogo className="auth-brand__logo" alt="University logo" />
          <div>
            <p className="eyebrow">Public Safety University</p>
            <h1>Welcome</h1>
          </div>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((value) => ({ ...value, email: event.target.value }))
              }
              placeholder="student@mail.com"
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
              placeholder="********"
              required
            />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="primary-button auth-form__submit" type="submit">
            Login
          </button>
        </form>
        <p className="auth-switch">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </section>
    </div>
  );
}

export default LoginPage;
