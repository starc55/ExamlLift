import { motion } from "framer-motion";

function DashboardCard({ label, value, helper, tone = "default" }) {
  return (
    <motion.article
      className={`dashboard-card dashboard-card--${tone}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.3 }}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </motion.article>
  );
}

export default DashboardCard;
