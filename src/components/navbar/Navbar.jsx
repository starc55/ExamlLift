import { motion } from "framer-motion";
import { HiArrowRightOnRectangle, HiBars3 } from "react-icons/hi2";
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getActiveUser, logoutUser } from "../../services/auth/localAuth";
import BrandLogo from "../BrandLogo";

const titles = {
  "/dashboard": "Dashboard",
  "/content": "Content",
  "/midterm": "Midterm",
  "/final": "Final Exam",
};

function Navbar({ onMenuToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getActiveUser();

  const title = useMemo(() => {
    if (location.pathname.startsWith("/content/")) {
      return "Content Detail";
    }

    return titles[location.pathname] || "IELTS Platform";
  }, [location.pathname]);

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  return (
    <motion.header
      className="navbar"
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="navbar__left">
        <button
          className="icon-button navbar__menu"
          onClick={onMenuToggle}
          aria-label="Open sidebar menu"
        >
          <HiBars3 className="icon-inline" />
        </button>
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.25 }}
        >
          <BrandLogo className="navbar__logo" alt="University logo" />
        </motion.div>
        <div className="navbar__title-block">
          <p className="eyebrow-1">English Learning Platform</p>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="navbar__right">
        <div className="navbar__user">
          <strong>{user?.name || "Student"}</strong>
          <span>Target band {user?.targetBand || "6.5"}</span>
        </div>
        <button
          className="secondary-button secondary-button--with-icon"
          onClick={handleLogout}
        >
          <HiArrowRightOnRectangle className="icon-inline" />
          <span>Logout</span>
        </button>
      </div>
    </motion.header>
  );
}

export default Navbar;
