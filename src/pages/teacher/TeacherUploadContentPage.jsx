import { useState } from "react";
import { Link } from "react-router-dom";
import UploadForm from "../../components/content/UploadForm";
import ContentCard from "../../components/content/ContentCard";
import { useAuth } from "../../context/AuthContext";
import { getAllHomeworkSubmissions } from "../../services/homework/homeworkService";
import { createContent, getAllContent } from "../../services/content/contentService";
import { fileToDataUrl } from "../../utils/fileHelpers";

const initialForm = {
  title: "",
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
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState("success");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contentItems, setContentItems] = useState(() => getAllContent().slice(0, 6));
  const submissions = getAllHomeworkSubmissions().filter(
    (submission) => submission.teacherId === currentUser.id
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatusMessage("");
    setStatusTone("success");
    setIsSubmitting(true);

    try {
      const [imageUrl, audioUrl, pdfUrl] = await Promise.all([
        fileToDataUrl(files.image),
        fileToDataUrl(files.audio),
        fileToDataUrl(files.pdf),
      ]);

      const sections = form.lessonNotes
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((body, index) => ({
          heading: `Lesson block ${index + 1}`,
          body,
        }));

      createContent({
        ...form,
        imageUrl,
        audioUrl,
        pdfUrl,
        sections,
        createdBy: currentUser.id,
        createdByName: currentUser.fullname,
      });

      setForm(initialForm);
      setFiles({ image: null, audio: null, pdf: null });
      setContentItems(getAllContent().slice(0, 6));
      setStatusMessage("New lesson saved and published to the student content library.");
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(error.message);
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
      <UploadForm
        form={form}
        onChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))}
        onFileChange={handleFileChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
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
      <section className="content-library compact-card-grid">
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
            <h2>Homework submissions are now handled in a dedicated panel</h2>
          </div>
          <span className="pill">{submissions.length} submissions</span>
        </div>
        <p>
          Content upload bu yerda qoladi, lekin AI-enabled homework creation va
          submission review endi alohida homework sahifalarida ishlaydi.
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
