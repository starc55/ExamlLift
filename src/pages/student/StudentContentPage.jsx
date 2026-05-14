import { useEffect, useState } from "react";
import ContentCard from "../../components/content/ContentCard";
import ErrorAlert from "../../components/feedback/ErrorAlert";
import { getAllContent } from "../../services/content/contentService";

function StudentContentPage() {
  const [contentItems, setContentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadContent() {
      setLoading(true);
      setError("");

      try {
        const data = await getAllContent();

        if (isMounted) {
          setContentItems(data);
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
  }, []);

  return (
    <div className="page-stack">
      <section className="section-heading">
        <div>
          <p className="eyebrow">Student content</p>
          <h2>Select a topic and open the full lesson</h2>
        </div>
      </section>

      {loading ? <p className="empty-copy">Loading content...</p> : null}
      <ErrorAlert message={error} />

      <section className="content-library content-library--single-column">
        {!loading && !contentItems.length ? (
          <section className="card empty-state">
            <h3>No content yet</h3>
            <p>Join a class or wait for your teacher to publish lessons.</p>
          </section>
        ) : null}
        {contentItems.map((item) => (
          <ContentCard
            key={item.id}
            item={item}
            to={`/student/content/${item.id}`}
            actionLabel="Open topic"
          />
        ))}
      </section>
    </div>
  );
}

export default StudentContentPage;
