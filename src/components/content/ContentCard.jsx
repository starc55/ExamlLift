import { motion } from "framer-motion";
import { FaBookOpen, FaClock, FaHeadphones } from "react-icons/fa6";
import { Link } from "react-router-dom";

function ContentCard({
  item,
  isActive,
  onOpen,
  to,
  showAction = true,
  actionLabel = "Open lesson",
}) {
  const description =
    item.description?.length > 120
      ? `${item.description.slice(0, 120).trim()}...`
      : item.description;

  return (
    <motion.article
      className={`content-library-card ${
        isActive ? "content-library-card--active" : ""
      }`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.3 }}
    >
      <img
        src={item.imageUrl || "/brand-logo.png"}
        alt={item.title}
        className="content-library-card__image"
      />
      <div className="content-library-card__body">
        <span className="pill">{item.level}</span>
        <h3>{item.title}</h3>
        <p>{description}</p>
        <div className="content-card__meta">
          <span className="meta-inline">
            <FaBookOpen className="meta-inline__icon" />
            <span>{item.category}</span>
          </span>
          <span className="meta-inline">
            <FaClock className="meta-inline__icon" />
            <span>{item.duration}</span>
          </span>
          <span className="meta-inline">
            <FaHeadphones className="meta-inline__icon" />
            <span>{item.audioUrl ? "Audio ready" : "No audio"}</span>
          </span>
        </div>
        {showAction ? (
          to ? (
            <Link className="primary-button card-link" to={to}>
              {actionLabel}
            </Link>
          ) : (
            <button
              className="primary-button card-link"
              onClick={() => onOpen(item)}
            >
              {isActive ? "Opened" : actionLabel}
            </button>
          )
        ) : null}
      </div>
    </motion.article>
  );
}

export default ContentCard;
