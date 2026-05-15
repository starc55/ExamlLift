import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AudioPlayer from "../../components/audio/AudioPlayer";
import ErrorAlert from "../../components/feedback/ErrorAlert";
import PDFViewer from "../../components/pdf/PDFViewer";
import { getContentDetails } from "../../services/content/contentService";

function StudentContentDetailPage() {
  const { id } = useParams();
  const [selectedContent, setSelectedContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadContent() {
      setLoading(true);
      setError("");

      try {
        const data = await getContentDetails(id);

        if (isMounted) {
          setSelectedContent(data);
        }
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    loadContent();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return <p className="empty-copy">Loading content...</p>;
  }

  if (!selectedContent) {
    return (
      <section className="card empty-state">
        <h3>Content not found</h3>
        <ErrorAlert message={error} />
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
            src={selectedContent.pdfUrl || selectedContent.fileUrl}
            title={`${selectedContent.title} PDF`}
          />
        </div>

        <section className="assignment-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Homework workflow</p>
              <h3>{selectedContent.assignmentTitle || "Homework task"}</h3>
            </div>
            <span className="pill pill--soft">Homework Center</span>
          </div>
          <p>{selectedContent.assignmentInstructions}</p>
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
