import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";

function NotFoundPage() {
  return (
    <main className="not-found-page">
      <section className="not-found-card">
        <BrandLogo className="not-found-card__logo" alt="AESAC logo" />
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p>
          The page may have moved, or the address may be incorrect. Return to a
          known workspace and continue from there.
        </p>
        <div className="not-found-card__actions">
          <Link to="/login" className="primary-button">
            Go to login
          </Link>
          <Link to="/" className="secondary-button">
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}

export default NotFoundPage;
