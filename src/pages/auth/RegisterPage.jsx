import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import BrandLogo from "../../components/BrandLogo";
import { getDefaultRouteByRole, ROLES } from "../../constants/roles";
import { useAuth } from "../../context/AuthContext";

function RegisterPage() {
  const { currentUser, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullname: "",
    email: "",
    password: "",
    role: ROLES.STUDENT,
    targetBand: "6.5",
    specialization: "English teacher",
  });
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
      const user = await register(form);
      navigate(getDefaultRouteByRole(user.role), { replace: true });
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
            <p className="eyebrow">Professional onboarding</p>
            <h1>Create your account</h1>
          </div>
        </div>
        <p className="auth-intro">
          Register as a student or teacher. The structure is also ready for a future
          admin role.
        </p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Full name
              <input
                type="text"
                value={form.fullname}
                onChange={(event) =>
                  setForm((value) => ({ ...value, fullname: event.target.value }))
                }
                placeholder="Alex Johnson"
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
                placeholder="alex@example.com"
                required
              />
            </label>
          </div>
          <div className="form-grid">
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
              Role
              <select
                value={form.role}
                onChange={(event) =>
                  setForm((value) => ({ ...value, role: event.target.value }))
                }
              >
                <option value={ROLES.STUDENT}>Student</option>
                <option value={ROLES.TEACHER}>Teacher</option>
              </select>
            </label>
          </div>
          {form.role === ROLES.STUDENT ? (
            <label>
              Target band
              <select
                value={form.targetBand}
                onChange={(event) =>
                  setForm((value) => ({ ...value, targetBand: event.target.value }))
                }
              >
                <option>5.5</option>
                <option>6.0</option>
                <option>6.5</option>
                <option>7.0</option>
                <option>7.5</option>
                <option>8.0</option>
              </select>
            </label>
          ) : (
            <label>
              Specialization
              <input
                value={form.specialization}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    specialization: event.target.value,
                  }))
                }
                placeholder="IELTS mentor"
              />
            </label>
          )}
          {error ? <p className="error-text">{error}</p> : null}
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Register"}
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
