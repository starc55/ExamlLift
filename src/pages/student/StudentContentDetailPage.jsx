import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AudioPlayer from "../../components/audio/AudioPlayer";
import FeedbackCard from "../../components/feedback/FeedbackCard";
import PDFViewer from "../../components/pdf/PDFViewer";
import { useAuth } from "../../context/AuthContext";
import {
  getAssignmentsForStudent,
  submitAssignment,
} from "../../services/content/assignmentService";
import { getAssignmentFeedback } from "../../services/ai/assignmentFeedback";
import { getAllContent } from "../../services/content/contentService";
import { fileToDataUrl } from "../../utils/fileHelpers";

function StudentContentDetailPage() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const contentItems = useMemo(() => getAllContent(), []);
  const selectedContent = contentItems.find((item) => item.id === id) || null;
  const [studentAssignments, setStudentAssignments] = useState(() =>
    getAssignmentsForStudent(currentUser.id)
  );
  const [assignmentNote, setAssignmentNote] = useState("");
  const [assignmentFile, setAssignmentFile] = useState(null);
  const [assignmentFileName, setAssignmentFileName] = useState("");
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [assignmentMessageTone, setAssignmentMessageTone] = useState("success");
  const [latestAiFeedback, setLatestAiFeedback] = useState("");
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);
  const assignmentInputId = "student-assignment-file";

  const currentAssignments = useMemo(() => {
    if (!selectedContent) {
      return [];
    }

    return studentAssignments.filter(
      (assignment) => assignment.contentId === selectedContent.id
    );
  }, [selectedContent, studentAssignments]);

  const latestAssignment = currentAssignments[0] || null;

  const handleAssignmentSubmit = async (event) => {
    event.preventDefault();

    if (!selectedContent) {
      return;
    }

    setAssignmentMessage("");
    setAssignmentMessageTone("success");
    setIsSubmittingAssignment(true);

    try {
      const fileUrl = await fileToDataUrl(assignmentFile);
      const aiFeedback = getAssignmentFeedback({
        note: assignmentNote,
        fileName: assignmentFileName,
        contentTitle: selectedContent.title,
        taskTitle:
          selectedContent.assignmentTitle ||
          `${selectedContent.title} follow-up task`,
      });

      const savedAssignment = submitAssignment({
        contentId: selectedContent.id,
        contentTitle: selectedContent.title,
        taskTitle:
          selectedContent.assignmentTitle ||
          `${selectedContent.title} follow-up task`,
        studentId: currentUser.id,
        studentName: currentUser.fullname,
        teacherId: selectedContent.createdBy,
        teacherName: selectedContent.createdByName,
        note: assignmentNote,
        fileName: assignmentFileName,
        fileUrl,
        aiFeedback,
      });

      setStudentAssignments(getAssignmentsForStudent(currentUser.id));
      setLatestAiFeedback(savedAssignment.aiFeedback);
      setAssignmentNote("");
      setAssignmentFile(null);
      setAssignmentFileName("");
      setAssignmentMessage(
        "The assignment has been sent to the teacher panel and AI feedback is ready."
      );
    } catch (error) {
      setAssignmentMessageTone("error");
      setAssignmentMessage(error.message);
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

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
              <p className="eyebrow">Lesson task</p>
              <h3>{selectedContent.assignmentTitle || "Homework task"}</h3>
            </div>
            <span
              className={`status-dot ${
                latestAssignment?.status === "accepted"
                  ? "status-dot--live"
                  : ""
              }`}
            >
              {latestAssignment?.status || "not sent"}
            </span>
          </div>
          <p>{selectedContent.assignmentInstructions}</p>
          {latestAssignment ? (
            <div className="assignment-panel__latest">
              <strong>Latest submission</strong>
              <p>{latestAssignment.note || "No note attached."}</p>
              <div className="content-card__meta">
                <span>
                  {new Date(latestAssignment.submittedAt).toLocaleDateString()}
                </span>
                <span>{latestAssignment.fileName || "No file attached"}</span>
              </div>
            </div>
          ) : null}
          <form className="assignment-form" onSubmit={handleAssignmentSubmit}>
            <label>
              Short note for teacher
              <textarea
                rows={4}
                value={assignmentNote}
                onChange={(event) => setAssignmentNote(event.target.value)}
                placeholder="Write what you prepared, what to review, or any question for the teacher."
              />
            </label>
            <div className="file-field">
              <span>Upload assignment file</span>
              <span className="file-field__helper">
                PDF, audio, image, or any document for the teacher
              </span>
              <input
                id={assignmentInputId}
                className="file-field__input"
                type="file"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] || null;
                  setAssignmentFile(nextFile);
                  setAssignmentFileName(nextFile?.name || "");
                }}
              />
              <div className="file-field__row">
                <label
                  htmlFor={assignmentInputId}
                  className="file-field__trigger"
                >
                  Choose file
                </label>
                <strong className="file-field__name">
                  {assignmentFileName || "No file selected"}
                </strong>
              </div>
            </div>
            {assignmentMessage ? (
              <p
                className={
                  assignmentMessageTone === "success"
                    ? "success-text"
                    : "error-text"
                }
              >
                {assignmentMessage}
              </p>
            ) : null}
            <button
              className="primary-button card-link"
              type="submit"
              disabled={isSubmittingAssignment}
            >
              {isSubmittingAssignment ? "Sending..." : "Send to teacher"}
            </button>
          </form>
          <FeedbackCard
            title="Assignment AI feedback"
            feedback={latestAiFeedback || latestAssignment?.aiFeedback}
          />
        </section>
      </section>
    </div>
  );
}

export default StudentContentDetailPage;
