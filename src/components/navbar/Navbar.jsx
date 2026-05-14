import { motion } from "framer-motion";
import { HiArrowRightOnRectangle, HiBars3 } from "react-icons/hi2";
import { useLocation, useNavigate } from "react-router-dom";
import { resolvePageTitle } from "../../config/navigation";
import { ROLE_LABELS } from "../../constants/roles";
import { useAuth } from "../../context/AuthContext";

function Navbar({ onMenuToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
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
        ></motion.div>
        <div className="navbar__title-block">
          <p className="eyebrow-1">Scalable English learning</p>
          <h2>{resolvePageTitle(location.pathname)}</h2>
        </div>
      </div>
      <div className="navbar__right">
        <div className="navbar__user">
          <strong>{currentUser?.fullname || "User"}</strong>
          <span>
            {ROLE_LABELS[currentUser?.role]}{" "}
            {currentUser?.targetBand
              ? `• target ${currentUser.targetBand}`
              : ""}
          </span>
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
