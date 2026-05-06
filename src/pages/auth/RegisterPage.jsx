import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import BrandLogo from "../../components/BrandLogo";
import { getActiveUser, registerUser } from "../../services/auth/localAuth";

function RegisterPage() {
  const user = getActiveUser();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    targetBand: "6.5"
  });
  const [error, setError] = useState("");

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = (event) => {
    event.preventDefault();

    try {
      registerUser(form);
      navigate("/dashboard");
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  return (
    <div className="auth-page auth-page--register">
      <section className="auth-card">
        <div className="auth-brand">
          <BrandLogo className="auth-brand__logo" alt="University logo" />
          <div>
            <p className="eyebrow">Create account</p>
            <h1>Start your IELTS plan</h1>
          </div>
        </div>
        <p className="auth-intro">
          Join Public Safety University and get access to personalized IELTS
          preparation plans, interactive lessons, and AI-powered feedback to
          help you achieve your target band score.
        </p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((value) => ({ ...value, name: event.target.value }))
              }
              placeholder="Ali Valiyev"
              required
            />
          </label>
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
              placeholder="Minimum 6 characters"
              minLength={6}
              required
            />
          </label>
          <label>
            Target band
            <select
              value={form.targetBand}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  targetBand: event.target.value
                }))
              }
            >
              <option>5.5</option>
              <option>6.0</option>
              <option>6.5</option>
              <option>7.0</option>
              <option>7.5</option>
              <option>8.0</option>
              <option>8.5</option>
              <option>9.0</option>
            </select>
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="primary-button auth-form__submit" type="submit">
            Register
          </button>
        </form>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </section>
    </div>
  );
}

export default RegisterPage;
