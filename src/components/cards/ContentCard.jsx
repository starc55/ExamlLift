import { motion } from "framer-motion";
import { FaBookOpen, FaClock } from "react-icons/fa6";
import { Link } from "react-router-dom";

function ContentCard({ item }) {
  return (
    <motion.article
      className="card content-card"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -4 }}
    >
      <img src={item.image} alt={item.title} className="content-card__image" />
      <div className="content-card__body">
        <span className="pill">{item.level}</span>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        <div className="content-card__meta">
          <span className="meta-inline">
            <FaBookOpen className="meta-inline__icon" />
            <span>{item.category}</span>
          </span>
          <span className="meta-inline">
            <FaClock className="meta-inline__icon" />
            <span>{item.duration}</span>
          </span>
        </div>
        <Link to={`/content/${item.id}`} className="primary-button card-link">
          Open lesson
        </Link>
      </div>
    </motion.article>
  );
}

export default ContentCard;
