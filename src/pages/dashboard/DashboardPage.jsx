import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import topics from "../../data/content/topics.json";
import midterm from "../../data/tests/midterm.json";
import TestCard from "../../components/cards/TestCard";
import ProgressBar from "../../components/ProgressBar";

function DashboardPage() {
  const totalMidtermQuestions =
    midterm.vocabulary.length + midterm.grammar.length + 1;
  const totalFinalBlocks = 4;

  return (
    <div className="page-stack">
      <motion.section
        className="hero-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <p className="eyebrow">Learning overview</p>
          <h3>English practice dashboard with a structured IELTS flow</h3>
          <p>
            Students can review lesson content, complete midterm and final
            assessments, and receive short AI-style feedback in a friendly
            format.
          </p>
        </div>
        <div className="hero-card__stats">
          <div className="metric-card">
            <strong>{topics.length}</strong>
            <span>Content modules</span>
          </div>
          <div className="metric-card">
            <strong>{totalMidtermQuestions}</strong>
            <span>Midterm steps</span>
          </div>
          <div className="metric-card">
            <strong>{totalFinalBlocks}</strong>
            <span>Final sections</span>
          </div>
        </div>
      </motion.section>

      <section className="dashboard-grid">
        <TestCard
          title="Content Library"
          description="Lesson cards with audio, PDF, and text content."
          stats={`${topics.length} lessons`}
        >
          <ProgressBar label="Lesson library ready" value={100} />
          <Link to="/content" className="primary-button card-link">
            Browse content
          </Link>
        </TestCard>

        <TestCard
          title="Midterm Assessment"
          description="Vocabulary, grammar, and speaking flow in one page."
          stats="Auto scoring"
        >
          <ProgressBar label="Assessment modules" value={92} />
          <Link to="/midterm" className="primary-button card-link">
            Start midterm
          </Link>
        </TestCard>

        <TestCard
          title="Final Exam"
          description="Includes writing, speaking, listening, and reading sections."
          stats="AI-ready services"
        >
          <ProgressBar label="Final exam workspace" value={95} />
          <Link to="/final" className="primary-button card-link">
            Open final exam
          </Link>
        </TestCard>
      </section>
    </div>
  );
}

export default DashboardPage;
