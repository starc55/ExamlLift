const DESCRIPTION_MAX_CHARS = 1000;
const LESSON_NOTES_MAX_CHARS = 10000;
const ASSIGNMENT_TITLE_MAX_CHARS = 200;
const ASSIGNMENT_BRIEF_MAX_CHARS = 2000;

function UploadForm({ form, onChange, onFileChange, onSubmit, isSubmitting }) {
  const fileFields = [
    {
      key: "image",
      inputId: "upload-image-file",
      label: "Image upload",
      accept: "image/jpeg,image/png,image/webp",
      helper: "JPG, PNG, WebP. Large images are resized; max 2MB after optimization.",
    },
    {
      key: "audio",
      inputId: "upload-audio-file",
      label: "Audio upload",
      accept: "audio/*",
      helper: "MP3, WAV, WebM, or OGG. Max 20MB.",
    },
    {
      key: "pdf",
      inputId: "upload-pdf-file",
      label: "PDF upload",
      accept: "application/pdf",
      helper: "Worksheet, guide or homework sheet. Max 10MB.",
    },
  ];

  return (
    <form className="upload-form card" onSubmit={onSubmit}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Teacher tool</p>
          <h3>Create new lesson content</h3>
        </div>
      </div>
      <div className="form-grid">
        <label>
          Title
          <input
            value={form.title}
            onChange={(event) => onChange("title", event.target.value)}
            placeholder="Lesson title"
            required
            disabled={isSubmitting}
          />
        </label>
        <label>
          Category
          <input
            value={form.category}
            onChange={(event) => onChange("category", event.target.value)}
            placeholder="Grammar / Reading / Speaking"
            required
            disabled={isSubmitting}
          />
        </label>
        <label>
          Level
          <select
            value={form.level}
            onChange={(event) => onChange("level", event.target.value)}
            disabled={isSubmitting}
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
            value={form.duration}
            onChange={(event) => onChange("duration", event.target.value)}
            placeholder="15 min"
            required
            disabled={isSubmitting}
          />
        </label>
      </div>
      <label>
        Description
        <textarea
          value={form.description}
          onChange={(event) => onChange("description", event.target.value)}
          rows={4}
          maxLength={DESCRIPTION_MAX_CHARS}
          placeholder="Short lesson description"
          required
          disabled={isSubmitting}
        />
      </label>
      <label>
        Lesson notes
        <textarea
          value={form.lessonNotes}
          onChange={(event) => onChange("lessonNotes", event.target.value)}
          rows={6}
          maxLength={LESSON_NOTES_MAX_CHARS}
          placeholder="Write short notes. Each paragraph becomes one lesson block."
          disabled={isSubmitting}
        />
      </label>
      <div className="form-grid">
        <label>
          Assignment title
          <input
            value={form.assignmentTitle}
            onChange={(event) =>
              onChange("assignmentTitle", event.target.value)
            }
            maxLength={ASSIGNMENT_TITLE_MAX_CHARS}
            placeholder="Homework or follow-up task title"
            required
            disabled={isSubmitting}
          />
        </label>
        <label className="form-grid__wide">
          Assignment brief
          <textarea
            value={form.assignmentInstructions}
            onChange={(event) => onChange("assignmentInstructions", event.target.value)}
            rows={4}
            maxLength={ASSIGNMENT_BRIEF_MAX_CHARS}
            placeholder="Describe what the student should submit after the lesson."
            required
            disabled={isSubmitting}
          />
        </label>
      </div>
      <div className="form-grid">
        {fileFields.map((field) => (
          <div key={field.key} className="file-field">
            <span>{field.label}</span>
            <span className="file-field__helper">{field.helper}</span>
            <input
              id={field.inputId}
              className="file-field__input"
              type="file"
              accept={field.accept}
              disabled={isSubmitting}
              onChange={(event) => onFileChange(field.key, event.target.files?.[0] || null)}
            />
            <div className="file-field__row">
              <label htmlFor={field.inputId} className="file-field__trigger">
                Choose file
              </label>
              <strong className="file-field__name">
                {form.fileNames?.[field.key] || "No file selected"}
              </strong>
            </div>
          </div>
        ))}
      </div>
      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save content"}
      </button>
    </form>
  );
}

export default UploadForm;
