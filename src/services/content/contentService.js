import topics from "../../data/content/topics.json";
import { contentAssets } from "../../assets/content/assetRegistry";
import { readStorage, seedStorage, writeStorage } from "../shared/storage";

const CONTENT_KEY = "english-platform-content";

const seededContent = topics.map((topic, index) => ({
  id: topic.id,
  title: topic.title,
  description: topic.description,
  category: topic.category,
  level: topic.level,
  duration: topic.duration,
  imageUrl: contentAssets.images[topic.imageKey],
  audioUrl: contentAssets.audio[topic.audioKey],
  pdfUrl: contentAssets.pdf[topic.pdfKey],
  sections: topic.sections,
  assignmentTitle: `${topic.title} practice task`,
  assignmentInstructions: `Review "${topic.title}" and upload a short homework response for your teacher. You can send notes, a document, audio, or any relevant supporting file.`,
  createdAt: new Date(Date.UTC(2026, 0, index + 10)).toISOString(),
  createdBy: "teacher-demo",
  createdByName: "Dilshod Rahimov",
}));

function ensureContentSeeded() {
  seedStorage(CONTENT_KEY, seededContent);
}

export function getAllContent() {
  ensureContentSeeded();

  return readStorage(CONTENT_KEY, []).sort(
    (left, right) => new Date(right.createdAt) - new Date(left.createdAt)
  );
}

export function createContent(payload) {
  const nextItem = {
    id: `content-${Date.now()}`,
    title: payload.title,
    description: payload.description,
    category: payload.category || "General English",
    level: payload.level || "Intermediate",
    duration: payload.duration || "10 min",
    imageUrl: payload.imageUrl || "/brand-logo.png",
    audioUrl: payload.audioUrl || "",
    pdfUrl: payload.pdfUrl || "",
    sections: payload.sections?.length
      ? payload.sections
      : [
          {
            heading: "Lesson overview",
            body: payload.description,
          },
        ],
    assignmentTitle: payload.assignmentTitle || `${payload.title} follow-up task`,
    assignmentInstructions:
      payload.assignmentInstructions ||
      "Upload your completed task or reflection and send it to your teacher for review.",
    createdAt: new Date().toISOString(),
    createdBy: payload.createdBy,
    createdByName: payload.createdByName,
  };

  const content = getAllContent();
  writeStorage(CONTENT_KEY, [nextItem, ...content]);
  return nextItem;
}

export function updateContent(id, updates) {
  const content = getAllContent().map((item) =>
    item.id === id ? { ...item, ...updates } : item
  );

  writeStorage(CONTENT_KEY, content);
  return content.find((item) => item.id === id) || null;
}

export function deleteContent(id) {
  const content = getAllContent().filter((item) => item.id !== id);
  writeStorage(CONTENT_KEY, content);
}
