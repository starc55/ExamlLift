import { useState } from "react";
import UploadForm from "../../components/content/UploadForm";
import ContentCard from "../../components/content/ContentCard";
import { useAuth } from "../../context/AuthContext";
import {
  getAssignmentsForTeacher,
  updateAssignmentStatus,
} from "../../services/content/assignmentService";
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
  const [assignments, setAssignments] = useState(() =>
    getAssignmentsForTeacher(currentUser.id)
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

  const handleAcceptAssignment = (assignmentId) => {
    updateAssignmentStatus(assignmentId, "accepted");
    setAssignments(getAssignmentsForTeacher(currentUser.id));
    setStatusTone("success");
    setStatusMessage("Student assignment accepted successfully.");
  };

  const pendingAssignments = assignments.filter(
    (assignment) => assignment.status === "pending"
  );

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
            <p className="eyebrow">Student submissions</p>
            <h2>Review lesson tasks and accept them</h2>
          </div>
          <span className="pill">{pendingAssignments.length} pending</span>
        </div>
        <div className="assignment-list">
          {assignments.length ? (
            assignments.map((assignment) => (
              <article key={assignment.id} className="assignment-item">
                <div className="assignment-item__top">
                  <div>
                    <strong>{assignment.studentName}</strong>
                    <p>{assignment.contentTitle}</p>
                  </div>
                  <span
                    className={`status-dot ${
                      assignment.status === "accepted" ? "status-dot--live" : ""
                    }`}
                  >
                    {assignment.status}
                  </span>
                </div>
                <p className="assignment-item__task">{assignment.taskTitle}</p>
                <p>{assignment.note || "No note attached."}</p>
                <div className="content-card__meta">
                  <span>{new Date(assignment.submittedAt).toLocaleDateString()}</span>
                  <span>{assignment.fileName || "No file attached"}</span>
                </div>
                {assignment.status === "pending" ? (
                  <button
                    className="primary-button card-link"
                    onClick={() => handleAcceptAssignment(assignment.id)}
                  >
                    Accept task
                  </button>
                ) : (
                  <p className="success-text">Accepted by teacher</p>
                )}
              </article>
            ))
          ) : (
            <div className="empty-state">
              <h3>No submissions yet</h3>
              <p>Student task uploads will appear here for approval.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default TeacherUploadContentPage;
