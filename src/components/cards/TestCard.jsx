import { motion } from "framer-motion";
import { FaStar } from "react-icons/fa6";

function TestCard({ title, description, stats, children }) {
  return (
    <motion.section
      className="card test-card"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -4 }}
    >
      <div className="test-card__header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        {stats ? (
          <span className="pill pill--soft pill--with-icon">
            <FaStar className="meta-inline__icon" />
            <span>{stats}</span>
          </span>
        ) : null}
      </div>
      {children}
    </motion.section>
  );
}

export default TestCard;
