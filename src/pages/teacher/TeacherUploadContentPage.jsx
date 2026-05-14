import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import UploadForm from "../../components/content/UploadForm";
import ContentCard from "../../components/content/ContentCard";
import ErrorAlert from "../../components/feedback/ErrorAlert";
import { useAuth } from "../../context/AuthContext";
import { getTeacherClasses } from "../../services/classes/classService";
import { getAllHomeworkSubmissions } from "../../services/homework/homeworkService";
import {
  createContent,
  getAllContent,
  uploadContentFile,
} from "../../services/content/contentService";

const initialForm = {
  title: "",
  classId: "",
  category: "General English",
  level: "Intermediate",
  duration: "15 min",
  description: "",
  lessonNotes: "",
  assignmentTitle: "",
  assignmentInstructions: "",
  fileNames: {
    image: "",
    audio: "",
    pdf: "",
  },
};

function TeacherUploadContentPage() {
  const { currentUser } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState({ image: null, audio: null, pdf: null });
  const [classes, setClasses] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState("success");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contentItems, setContentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPageData = async () => {
    setLoading(true);
    setError("");

    try {
      const [nextClasses, nextContent, nextSubmissions] = await Promise.all([
        getTeacherClasses(),
        getAllContent(),
        getAllHomeworkSubmissions(),
      ]);
      setClasses(nextClasses);
      setContentItems(nextContent.slice(0, 6));
      setSubmissions(nextSubmissions);
      setForm((current) => ({
        ...current,
        classId: current.classId || nextClasses[0]?.id || "",
      }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatusMessage("");
    setStatusTone("success");
    setIsSubmitting(true);

    try {
      if (!form.classId) {
        throw new Error("Avval class yarating yoki class tanlang.");
      }

      const [imageUrl, audioUrl, pdfUrl] = await Promise.all([
        uploadContentFile(files.image, "content-images"),
        uploadContentFile(files.audio, "content-audio"),
        uploadContentFile(files.pdf, "content-pdf"),
      ]);

      const sections = form.lessonNotes
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((body, index) => ({
          heading: `Lesson block ${index + 1}`,
          body,
        }));

      await createContent({
        ...form,
        classId: form.classId,
        imageUrl,
        audioUrl,
        pdfUrl,
        sections,
        teacherId: currentUser.id,
      });

      setForm({ ...initialForm, classId: classes[0]?.id || "" });
      setFiles({ image: null, audio: null, pdf: null });
      await loadPageData();
      setStatusMessage("New lesson saved to Supabase and published to the selected class.");
    } catch (requestError) {
      setStatusTone("error");
      setStatusMessage(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (field, file) => {
    setFiles((current) => ({ ...current, [field]: file }));
    setForm((current) => ({
      ...current,
      fileNames: {
        ...current.fileNames,
        [field]: file?.name || "",
      },
    }));
  };

  return (
    <div className="page-stack">
      <section className="card">
        <label>
          Class
          <select
            value={form.classId}
            onChange={(event) =>
              setForm((current) => ({ ...current, classId: event.target.value }))
            }
          >
            <option value="">Select class</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        {!classes.length && !loading ? (
          <p className="empty-copy">
            Create a class before uploading content.
            <Link to="/teacher/classes" className="text-link"> Open classes</Link>
          </p>
        ) : null}
      </section>

      <UploadForm
        form={form}
        onChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))}
        onFileChange={handleFileChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
      <ErrorAlert message={error} />
      {statusMessage ? (
        <p className={statusTone === "success" ? "success-text" : "error-text"}>
          {statusMessage}
        </p>
      ) : null}

      <section className="section-heading">
        <div>
          <p className="eyebrow">Recent content</p>
          <h2>Latest uploaded lessons</h2>
        </div>
      </section>
      {loading ? <p className="empty-copy">Loading content...</p> : null}
      <section className="content-library compact-card-grid">
        {!loading && !contentItems.length ? (
          <section className="card empty-state">
            <h3>No content yet</h3>
            <p>Uploaded lessons will appear here.</p>
          </section>
        ) : null}
        {contentItems.map((item) => (
          <ContentCard
            key={item.id}
            item={item}
            isActive={false}
            onOpen={() => {}}
            showAction={false}
          />
        ))}
      </section>

      <section className="card assignment-review">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Homework management</p>
            <h2>Homework submissions are handled in a dedicated panel</h2>
          </div>
          <span className="pill">{submissions.length} submissions</span>
        </div>
        <p>
          Content upload is now backed by Supabase Storage and the contents table.
        </p>
        <div className="card-actions">
          <Link to="/teacher/homework" className="primary-button card-link">
            Open homework manager
          </Link>
          <Link to="/teacher/homework/submissions" className="secondary-button card-link">
            Review submissions
          </Link>
        </div>
      </section>
    </div>
  );
}

export default TeacherUploadContentPage;
