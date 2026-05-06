import topics from "../../data/content/topics.json";
import ContentCard from "../../components/cards/ContentCard";
import { contentAssets } from "../../assets/content/assetRegistry";

function ContentListPage() {
  const cards = topics.map((topic) => ({
    ...topic,
    image: contentAssets.images[topic.imageKey],
  }));

  return (
    <div className="page-stack">
      <section className="section-heading">
        <div>
          <p className="eyebrow">Lesson library</p>
          <h2>Topic-based IELTS and English learning content</h2>
        </div>
      </section>
      <section className="content-grid">
        {cards.map((item) => (
          <ContentCard key={item.id} item={item} />
        ))}
      </section>
    </div>
  );
}

export default ContentListPage;
