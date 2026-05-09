import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import AudioPlayer from "../../components/audio/AudioPlayer";
import PDFViewer from "../../components/pdf/PDFViewer";
import { getAllContent } from "../../services/content/contentService";

function StudentContentDetailPage() {
  const { id } = useParams();
  const contentItems = useMemo(() => getAllContent(), []);
  const selectedContent = contentItems.find((item) => item.id === id) || null;

  if (!selectedContent) {
    return (
      <section className="card empty-state">
        <h3>Content not found</h3>
        <Link to="/student/content" className="primary-button card-link">
          Back to content
        </Link>
      </section>
    );
  }

  return (
    <div className="page-stack">
      <Link to="/student/content" className="text-link">
        Back to content
      </Link>

      <section className="card content-preview content-preview--lesson-open">
        <div className="content-preview__hero">
          <img
            src={selectedContent.imageUrl || "/brand-logo.png"}
            alt={selectedContent.title}
            className="content-detail__image"
          />
          <div className="content-detail__summary">
            <span className="pill">{selectedContent.category}</span>
            <h2>{selectedContent.title}</h2>
            <p>{selectedContent.description}</p>
            <div className="content-card__meta">
              <span>{selectedContent.level}</span>
              <span>{selectedContent.duration}</span>
              <span>{selectedContent.createdByName}</span>
            </div>
          </div>
        </div>

        <div className="content-preview__notes">
          {selectedContent.sections.map((section) => (
            <div key={section.heading} className="prose-block">
              <h4>{section.heading}</h4>
              <p>{section.body}</p>
            </div>
          ))}
        </div>

        <div className="split-layout">
          <AudioPlayer
            src={selectedContent.audioUrl}
            title={`${selectedContent.title} audio`}
          />
          <PDFViewer
            src={selectedContent.pdfUrl}
            title={`${selectedContent.title} PDF`}
          />
        </div>

        <section className="assignment-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Homework workflow</p>
              <h3>{selectedContent.assignmentTitle || "Homework task"}</h3>
            </div>
            <span className="pill pill--soft">Moved to Homework Center</span>
          </div>
          <p>{selectedContent.assignmentInstructions}</p>
          <p>
            Bu lesson uchun topshiriqlar endi alohida homework markazida boshqariladi.
            U yerda AI feedback, audio transcription, local checking va submission
            history bir joyda ko'rsatiladi.
          </p>
          <div className="card-actions">
            <Link to="/student/homework" className="primary-button card-link">
              Open homework center
            </Link>
            <Link to="/student/results" className="secondary-button card-link">
              View results
            </Link>
          </div>
        </section>
      </section>
    </div>
  );
}

export default StudentContentDetailPage;
