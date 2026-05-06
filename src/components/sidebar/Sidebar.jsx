import { AnimatePresence, motion } from "framer-motion";
import {
  FaChartLine,
  FaFileLines,
  FaGraduationCap,
  FaHouse,
} from "react-icons/fa6";
import { NavLink } from "react-router-dom";
import BrandLogo from "../BrandLogo";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: FaHouse },
  { to: "/content", label: "Content", icon: FaFileLines },
  { to: "/midterm", label: "Midterm", icon: FaChartLine },
  { to: "/final", label: "Final Exam", icon: FaGraduationCap },
];

function Sidebar({ isOpen, onClose }) {
  return (
    <>
      <aside
        className={`sidebar ${isOpen ? "sidebar--open" : ""}`}
      >
        <motion.div
          className="sidebar__brand"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <BrandLogo className="sidebar__logo" alt="University logo" />
          <div>
            <strong>ExamLift</strong>
            <p>Raise your score</p>
          </div>
        </motion.div>
        <nav className="sidebar__nav">
          {navItems.map((item, index) => {
            const Icon = item.icon;

            return (
              <motion.div
                key={item.to}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.25 }}
              >
                <NavLink
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
                  }
                >
                  <span className="sidebar__link-content">
                    <Icon className="sidebar__link-icon" />
                    <span>{item.label}</span>
                  </span>
                </NavLink>
              </motion.div>
            );
          })}
        </nav>
        <motion.div
          className="sidebar__footer"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <span>EXAMLIFT v0.1</span>
        </motion.div>
      </aside>
      <AnimatePresence>
        {isOpen ? (
          <motion.button
            className="sidebar__backdrop"
            onClick={onClose}
            aria-label="Close sidebar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}

export default Sidebar;
