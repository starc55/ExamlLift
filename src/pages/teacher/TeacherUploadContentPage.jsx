import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import {
  FaChalkboardUser,
  FaChevronDown,
  FaEllipsisVertical,
  FaEye,
  FaLayerGroup,
  FaPenToSquare,
  FaTrashCan,
  FaUsers,
} from "react-icons/fa6";
import { Link } from "react-router-dom";
import UploadForm from "../../components/content/UploadForm";
import ContentCard from "../../components/content/ContentCard";
import ErrorAlert from "../../components/feedback/ErrorAlert";
import Modal from "../../components/layout/Modal";
import { useAuth } from "../../context/AuthContext";
import { getTeacherClasses } from "../../services/classes/classService";
import { getAllHomeworkSubmissions } from "../../services/homework/homeworkService";
import {
  createContent,
  deleteContent,
  getContentDetails,
  getContentList,
  removeEmptyFields,
  updateContent,
  uploadContentFiles,
  validateContentFile,
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

const DESCRIPTION_MAX_CHARS = 1000;
const LESSON_NOTES_MAX_CHARS = 50000;
const ASSIGNMENT_TITLE_MAX_CHARS = 200;
const ASSIGNMENT_BRIEF_MAX_CHARS = 2000;
const PREVIEW_MAX_SECTIONS = 5;
const PREVIEW_SECTION_MAX_CHARS = 1200;

const contentToForm = (item) => ({
  title: item.title || "",
  classId: item.classId || "",
  category: item.category || "General English",
  level: item.level || "Intermediate",
  duration: item.duration || "15 min",
  description: item.description || "",
  lessonNotes:
    item.body || (item.sections || []).map((section) => section.body).join("\n"),
  assignmentTitle: item.assignmentTitle || "",
  assignmentInstructions: item.assignmentInstructions || "",
  imageUrl: item.imageUrl || "",
  audioUrl: item.audioUrl || "",
  pdfUrl: item.pdfUrl || "",
  fileUrl: item.fileUrl || "",
  fileNames: {
    image: item.imageUrl ? "Existing image" : "",
    audio: item.audioUrl ? "Existing audio" : "",
    pdf: item.pdfUrl ? "Existing PDF" : "",
  },
});

function getPayloadSize(payload) {
  if (typeof payload === "string") {
    return payload.length;
  }

  if (typeof payload === "number" || typeof payload === "boolean") {
    return String(payload).length;
  }

  if (Array.isArray(payload)) {
    return payload.reduce((total, item) => total + getPayloadSize(item), 0);
  }

  if (payload && typeof payload === "object") {
    return Object.entries(payload).reduce(
      (total, [key, value]) => total + key.length + getPayloadSize(value),
      0
    );
  }

  return 0;
}

function getPreviewBody(body) {
  const value = String(body || "");

  if (value.length <= PREVIEW_SECTION_MAX_CHARS) {
    return value;
  }

  return `${value.slice(0, PREVIEW_SECTION_MAX_CHARS).trim()}...`;
}

const ContentPreviewBody = memo(function ContentPreviewBody({ content }) {
  const allSections = content.sections || [];
  const previewSections = allSections.slice(0, PREVIEW_MAX_SECTIONS);
  const hiddenSectionCount = Math.max(0, allSections.length - previewSections.length);

  return (
    <div className="modal-card__content">
      <p>{content.description}</p>
      <div className="content-action-preview__meta">
        <span>{content.category}</span>
        <span>{content.level}</span>
        <span>{content.duration}</span>
      </div>
      <div className="content-preview__notes">
        {previewSections.map((section) => (
          <div key={section.heading} className="prose-block">
            <h4>{section.heading}</h4>
            <p>{getPreviewBody(section.body)}</p>
          </div>
        ))}
        {hiddenSectionCount ? (
          <p className="content-preview__more">
            +{hiddenSectionCount} more lesson blocks
          </p>
        ) : null}
      </div>
      <div className="card-actions">
        {content.pdfUrl ? (
          <a className="secondary-button" href={content.pdfUrl} target="_blank" rel="noreferrer">
            Open PDF
          </a>
        ) : null}
        {content.audioUrl ? (
          <a className="secondary-button" href={content.audioUrl} target="_blank" rel="noreferrer">
            Open audio
          </a>
        ) : null}
      </div>
    </div>
  );
});

function TeacherUploadContentPage() {
  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id;
  const submitLockRef = useRef(false);
  const contentDetailsCacheRef = useRef(new Map());
  const previewRequestRef = useRef(null);
  const [form, setForm] = useState(initialForm);
  const [uploadFormKey, setUploadFormKey] = useState(0);
  const [files, setFiles] = useState({ image: null, audio: null, pdf: null });
  const [classes, setClasses] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState("success");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contentItems, setContentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState({
    percent: 0,
    message: "",
  });
  const [selectedContent, setSelectedContent] = useState(null);
  const [contentPreviewLoading, setContentPreviewLoading] = useState(false);
  const [contentPreviewError, setContentPreviewError] = useState("");
  const [editingContent, setEditingContent] = useState(null);
  const [deletingContent, setDeletingContent] = useState(null);
  const [editForm, setEditForm] = useState(initialForm);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const refreshHomeworkSubmissions = useCallback(async () => {
    try {
      const nextSubmissions = await getAllHomeworkSubmissions();
      setSubmissions(nextSubmissions);
    } catch (requestError) {
      console.error("Homework submissions refresh failed:", requestError);
    }
  }, []);

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [nextClasses, nextContent] = await Promise.all([
        getTeacherClasses(),
        getContentList(),
      ]);
      setClasses(nextClasses);
      setContentItems(nextContent.slice(0, 6));
      setForm((current) => ({
        ...current,
        classId: current.classId || nextClasses[0]?.id || "",
      }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPageData();
    void refreshHomeworkSubmissions();
  }, [loadPageData, refreshHomeworkSubmissions]);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (submitLockRef.current) {
      return;
    }

    const activeTimers = new Set();
    const startTimer = (label) => {
      activeTimers.add(label);
      console.time(label);
    };
    const endTimer = (label) => {
      if (!activeTimers.has(label)) {
        return;
      }

      activeTimers.delete(label);
      console.timeEnd(label);
    };

    startTimer("SAVE_TOTAL");
    submitLockRef.current = true;
    setStatusMessage("");
    setStatusTone("success");
    setError("");
    setUploadProgress({ percent: 0, message: "" });
    setIsSubmitting(true);
    let savingCleared = false;
    const clearSavingState = () => {
      if (savingCleared) {
        return;
      }

      savingCleared = true;
      submitLockRef.current = false;
      flushSync(() => {
        setIsSubmitting(false);
      });
      console.log("saving false");
      console.log("setSaving false done");
    };

    try {
      startTimer("VALIDATION");
      if (!form.classId) {
        throw new Error("Avval class yarating yoki class tanlang.");
      }
      if (!currentUserId) {
        throw new Error("Teacher account not found. Please log in again.");
      }
      endTimer("VALIDATION");
      console.log("validation done");

      startTimer("FILE_UPLOAD");
      const { imageUrl, audioUrl, pdfUrl } = await uploadContentFiles(files, {
        userId: currentUserId,
        onProgress: (progress) => {
          setUploadProgress(progress);
          setStatusMessage(progress.message);
        },
      });
      endTimer("FILE_UPLOAD");
      console.log("content upload done");
      console.log("upload done");
      console.log("public url done", {
        image: Boolean(imageUrl),
        audio: Boolean(audioUrl),
        pdf: Boolean(pdfUrl),
      });

      setStatusMessage("Content metadata databasega saqlanmoqda...");
      setUploadProgress({
        percent: 88,
        message: "Content metadata databasega saqlanmoqda...",
      });
      startTimer("BUILD_PAYLOAD");
      const savePayload = {
        title: form.title,
        classId: form.classId,
        description: "",
        lessonNotes: "",
        assignmentTitle: "",
        assignmentInstructions: "",
        imageUrl,
        audioUrl,
        pdfUrl,
        teacherId: currentUserId,
      };
      endTimer("BUILD_PAYLOAD");
      console.log("content save cleaned payload", {
        payloadSize: getPayloadSize(savePayload),
        lessonNotesLength: savePayload.lessonNotes?.length || 0,
      });
      startTimer("DB_INSERT");
      const savedContent = await createContent(savePayload);
      endTimer("DB_INSERT");
      console.log("content insert done");
      console.log("db insert done");

      startTimer("SET_SUCCESS_STATE");
      clearSavingState();
      setStatusTone("success");
      setStatusMessage("Content saved successfully");
      setForm({ ...initialForm, classId: form.classId || classes[0]?.id || "" });
      setFiles({ image: null, audio: null, pdf: null });
      setUploadFormKey((current) => current + 1);
      setContentItems((current) => [savedContent, ...current].slice(0, 6));
      setUploadProgress({
        percent: 100,
        message: "Upload complete.",
      });
      endTimer("SET_SUCCESS_STATE");
      startTimer("AFTER_SAVE_REFRESH");
      console.log("after-save refresh skipped");
      endTimer("AFTER_SAVE_REFRESH");
      console.log("refresh done");
    } catch (requestError) {
      console.error("Teacher content save failed:", requestError);
      setStatusTone("error");
      setStatusMessage(
        requestError.message || "Content upload failed. Please try again."
      );
      setUploadProgress({
        percent: 0,
        message: "",
      });
    } finally {
      endTimer("VALIDATION");
      endTimer("FILE_UPLOAD");
      endTimer("BUILD_PAYLOAD");
      endTimer("DB_INSERT");
      endTimer("SET_SUCCESS_STATE");
      endTimer("AFTER_SAVE_REFRESH");
      clearSavingState();
      endTimer("SAVE_TOTAL");
    }
  }, [classes, currentUserId, files, form]);

  const handleFileChange = useCallback((field, file) => {
    setStatusMessage("");
    setError("");

    try {
      validateContentFile(file, field);
      setFiles((current) => ({ ...current, [field]: file }));
      setForm((current) => ({
        ...current,
        fileNames: {
          ...current.fileNames,
          [field]: file?.name || "",
        },
      }));
    } catch (validationError) {
      setFiles((current) => ({ ...current, [field]: null }));
      setForm((current) => ({
        ...current,
        fileNames: {
          ...current.fileNames,
          [field]: "",
        },
      }));
      setError(validationError.message);
    }
  }, []);

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === form.classId) || null,
    [classes, form.classId]
  );

  const handleFormChange = useCallback((field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const handleClassChange = useCallback((event) => {
    setForm((current) => ({
      ...current,
      classId: event.target.value,
    }));
  }, []);

  const getCachedContentDetails = useCallback(async (item) => {
    const cachedDetails = contentDetailsCacheRef.current.get(item.id);

    if (cachedDetails) {
      return cachedDetails;
    }

    const details = await getContentDetails(item.id);
    if (!details) {
      throw new Error("Content details not found.");
    }

    contentDetailsCacheRef.current.set(item.id, details);
    return details;
  }, []);

  const openContentPreview = useCallback(async (item) => {
    const requestId = Symbol(item.id);

    previewRequestRef.current = requestId;
    setSelectedContent(item);
    setContentPreviewError("");
    setContentPreviewLoading(true);

    try {
      const details = await getCachedContentDetails(item);

      if (previewRequestRef.current === requestId) {
        setSelectedContent(details);
      }
    } catch (requestError) {
      if (previewRequestRef.current === requestId) {
        setContentPreviewError(requestError.message);
      }
    } finally {
      if (previewRequestRef.current === requestId) {
        setContentPreviewLoading(false);
      }
    }
  }, [getCachedContentDetails]);

  const closeContentPreview = useCallback(() => {
    previewRequestRef.current = null;
    setSelectedContent(null);
    setContentPreviewError("");
    setContentPreviewLoading(false);
  }, []);

  const openEditContent = useCallback(async (item) => {
    setError("");

    try {
      const details = await getCachedContentDetails(item);
      setEditingContent(details);
      setEditForm(contentToForm(details));
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [getCachedContentDetails]);

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    setIsEditing(true);
    setError("");
    setStatusMessage("");

    try {
      const cleanedPayload = removeEmptyFields({
        title: editForm.title,
        classId: editForm.classId,
        category: editForm.category,
        level: editForm.level,
        duration: editForm.duration,
        description: editForm.description,
        lessonNotes: editForm.lessonNotes,
        assignmentTitle: editForm.assignmentTitle,
        assignmentInstructions: editForm.assignmentInstructions,
        imageUrl: editForm.imageUrl,
        audioUrl: editForm.audioUrl,
        pdfUrl: editForm.pdfUrl,
        fileUrl: editForm.fileUrl,
      });
      const updated = await updateContent(editingContent.id, cleanedPayload);

      contentDetailsCacheRef.current.delete(editingContent.id);
      setContentItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setEditingContent(null);
      setStatusTone("success");
      setStatusMessage("Content updated.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteContent = async () => {
    setIsDeleting(true);
    setError("");
    setStatusMessage("");

    try {
      await deleteContent(deletingContent.id);
      contentDetailsCacheRef.current.delete(deletingContent.id);
      setContentItems((current) =>
        current.filter((item) => item.id !== deletingContent.id)
      );
      setDeletingContent(null);
      setStatusTone("success");
      setStatusMessage("Content deleted.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const recentContentCards = useMemo(
    () =>
      contentItems.map((item) => (
        <article key={item.id} className="teacher-content-item">
          <ContentCard
            item={item}
            isActive={false}
            onOpen={() => {}}
            showAction={false}
          />
          <div className="teacher-content-item__footer">
            <div>
              <span className="pill pill--soft">{item.level}</span>
              <span className="pill pill--soft">{item.category}</span>
            </div>
            <details className="action-menu">
              <summary aria-label={`${item.title} actions`}>
                <FaEllipsisVertical />
                <span>Actions</span>
              </summary>
              <div className="action-menu__list">
                <button type="button" onClick={() => openContentPreview(item)}>
                  <FaEye />
                  <span>View</span>
                </button>
                <button type="button" onClick={() => openEditContent(item)}>
                  <FaPenToSquare />
                  <span>Edit</span>
                </button>
                <button type="button" onClick={() => setDeletingContent(item)}>
                  <FaTrashCan />
                  <span>Delete</span>
                </button>
              </div>
            </details>
          </div>
        </article>
      )),
    [contentItems, openContentPreview, openEditContent]
  );

  return (
    <div className="page-stack">
      <section className="class-publish-panel">
        <div className="class-publish-panel__summary">
          <span className="class-publish-panel__icon">
            <FaChalkboardUser />
          </span>
          <div>
            <p className="eyebrow">Publish target</p>
            <h2>{selectedClass?.title || "Choose a class"}</h2>
            <p>
              {selectedClass?.description ||
                "Select which class will receive this lesson."}
            </p>
          </div>
        </div>

        <div className="class-select-shell">
          <label htmlFor="content-class-select">Class</label>
          <div className="class-select-control">
            <FaLayerGroup className="class-select-control__leading" />
            <select
              id="content-class-select"
              value={form.classId}
              onChange={handleClassChange}
            >
              <option value="">Select class</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            <FaChevronDown className="class-select-control__chevron" />
          </div>
          <div className="class-publish-panel__meta">
            <span>
              <FaUsers />
              {selectedClass?.studentCount || 0} students
            </span>
            <span>{selectedClass?.inviteCode || "No invite code selected"}</span>
          </div>
        </div>

        {!classes.length && !loading ? (
          <p className="class-publish-panel__empty">
            Create a class before uploading content.
            <Link to="/teacher/classes" className="text-link"> Open classes</Link>
          </p>
        ) : null}
      </section>

      <UploadForm
        key={uploadFormKey}
        form={form}
        onChange={handleFormChange}
        onFileChange={handleFileChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
      {isSubmitting || uploadProgress.message ? (
        <section className="upload-progress-panel">
          <div className="progress__label">
            <strong>{uploadProgress.message || "Preparing upload..."}</strong>
            <span>{uploadProgress.percent}%</span>
          </div>
          <div className="progress__track">
            <span
              className="progress__fill"
              style={{ width: `${uploadProgress.percent}%` }}
            />
          </div>
        </section>
      ) : null}
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
        {recentContentCards}
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

      <Modal
        isOpen={Boolean(selectedContent)}
        title={selectedContent?.title || "Content preview"}
        onClose={closeContentPreview}
        className="modal-card--wide"
      >
        {isSubmitting ? (
          <p className="empty-copy">Saving content...</p>
        ) : contentPreviewLoading ? (
          <p className="empty-copy">Loading full lesson...</p>
        ) : null}
        <ErrorAlert message={contentPreviewError} />
        {!isSubmitting && !contentPreviewLoading && !contentPreviewError && selectedContent ? (
          <ContentPreviewBody content={selectedContent} />
        ) : null}
      </Modal>

      <Modal
        isOpen={Boolean(editingContent)}
        title="Edit content"
        onClose={() => setEditingContent(null)}
        className="modal-card--wide"
      >
        <form className="modal-form content-edit-form" onSubmit={handleEditSubmit}>
          <div className="form-grid">
            <label>
              Class
              <select
                value={editForm.classId}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, classId: event.target.value }))
                }
                required
              >
                <option value="">Select class</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Title
              <input
                value={editForm.title}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, title: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Category
              <input
                value={editForm.category}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, category: event.target.value }))
                }
              />
            </label>
            <label>
              Level
              <select
                value={editForm.level}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, level: event.target.value }))
                }
              >
                <option>Beginner</option>
                <option>Elementary</option>
                <option>Intermediate</option>
                <option>Upper-intermediate</option>
                <option>Advanced</option>
              </select>
            </label>
            <label>
              Duration
              <input
                value={editForm.duration}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, duration: event.target.value }))
                }
              />
            </label>
          </div>
          <label>
            Description
            <textarea
              rows={4}
              value={editForm.description}
              maxLength={DESCRIPTION_MAX_CHARS}
              onChange={(event) =>
                setEditForm((current) => ({ ...current, description: event.target.value }))
              }
              required
            />
          </label>
          <label>
            Lesson notes
            <textarea
              rows={7}
              value={editForm.lessonNotes}
              maxLength={LESSON_NOTES_MAX_CHARS}
              onChange={(event) =>
                setEditForm((current) => ({ ...current, lessonNotes: event.target.value }))
              }
            />
          </label>
          <div className="form-grid">
            <label>
              Assignment title
              <input
                value={editForm.assignmentTitle}
                maxLength={ASSIGNMENT_TITLE_MAX_CHARS}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, assignmentTitle: event.target.value }))
                }
              />
            </label>
            <label className="form-grid__wide">
              Assignment brief
              <textarea
                rows={4}
                value={editForm.assignmentInstructions}
                maxLength={ASSIGNMENT_BRIEF_MAX_CHARS}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    assignmentInstructions: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <div className="manage-test-form__footer">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setEditingContent(null)}
            >
              Cancel
            </button>
            <button className="primary-button" type="submit" disabled={isEditing}>
              {isEditing ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(deletingContent)}
        title="Delete content?"
        onClose={() => setDeletingContent(null)}
      >
        <div className="modal-card__content">
          <p>
            {deletingContent?.title} contentini o'chirishni tasdiqlaysizmi?
          </p>
          <div className="card-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setDeletingContent(null)}
            >
              Cancel
            </button>
            <button
              className="danger-button"
              type="button"
              onClick={handleDeleteContent}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default TeacherUploadContentPage;
