import { Link, useParams } from "react-router-dom";
import AudioPlayer from "../../components/audio/AudioPlayer";
import PDFViewer from "../../components/pdf/PDFViewer";
import topics from "../../data/content/topics.json";
import { contentAssets } from "../../assets/content/assetRegistry";

function ContentDetailPage() {
  const { id } = useParams();
  const topic = topics.find((item) => item.id === id);

  if (!topic) {
    return (
      <section className="card">
        <h2>Content not found</h2>
        <Link to="/content" className="primary-button card-link">
          Back to content
        </Link>
      </section>
    );
  }

  const image = contentAssets.images[topic.imageKey];
  const audioSrc = contentAssets.audio[topic.audioKey];
  const pdfSrc = contentAssets.pdf[topic.pdfKey];

  return (
    <div className="page-stack">
      <Link to="/content" className="text-link">
        ← Back to content
      </Link>
      <section className="card content-detail__hero">
        <img src={image} alt={topic.title} className="content-detail__image" />
        <div className="content-detail__summary">
          <span className="pill">{topic.category}</span>
          <h2>{topic.title}</h2>
          <p>{topic.description}</p>
          <div className="content-card__meta">
            <span>{topic.level}</span>
            <span>{topic.duration}</span>
          </div>
        </div>
      </section>

      <section className="card prose-card">
        <h3>Lesson notes</h3>
        {topic.sections.map((section) => (
          <div key={section.heading} className="prose-block">
            <h4>{section.heading}</h4>
            <p>{section.body}</p>
          </div>
        ))}
      </section>

      <div className="split-layout">
        <AudioPlayer src={audioSrc} title={`${topic.title} audio`} />
        <PDFViewer src={pdfSrc} title={`${topic.title} PDF`} />
      </div>
    </div>
  );
}

export default ContentDetailPage;
