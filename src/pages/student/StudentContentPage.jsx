import { useState } from "react";
import ContentCard from "../../components/content/ContentCard";
import { getAllContent } from "../../services/content/contentService";

function StudentContentPage() {
  const [contentItems] = useState(() => getAllContent());

  return (
    <div className="page-stack">
      <section className="section-heading">
        <div>
          <p className="eyebrow">Student content</p>
          <h2>Select a topic and open the full lesson</h2>
        </div>
      </section>

      <section className="content-library content-library--single-column">
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
