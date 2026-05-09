import { useMemo, useState } from "react";
import CriteriaBreakdown from "../../components/feedback/CriteriaBreakdown";
import FeedbackCard from "../../components/feedback/FeedbackCard";
import ScoreSummary from "../../components/feedback/ScoreSummary";
import WrongAnswersList from "../../components/feedback/WrongAnswersList";
import Modal from "../../components/layout/Modal";
import { getAllHomeworkSubmissions } from "../../services/homework/homeworkService";

function TeacherHomeworkSubmissionsPage() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("all");
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const submissions = useMemo(() => getAllHomeworkSubmissions(), []);

  const studentOptions = [...new Set(submissions.map((item) => item.studentName))];
  const filteredSubmissions = submissions.filter((submission) => {
    if (typeFilter !== "all" && submission.homeworkType !== typeFilter) {
      return false;
    }

    if (studentFilter !== "all" && submission.studentName !== studentFilter) {
      return false;
    }

    return true;
  });

  return (
    <div className="page-stack">
      <section className="section-heading section-heading--with-tools">
        <div>
          <p className="eyebrow">Homework submissions</p>
          <h2>Student homework review queue</h2>
        </div>
        <div className="filter-row">
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">All types</option>
            <option value="writing_homework">writing_homework</option>
            <option value="speaking_homework">speaking_homework</option>
            <option value="grammar_homework">grammar_homework</option>
            <option value="vocabulary_homework">vocabulary_homework</option>
            <option value="reading_homework">reading_homework</option>
            <option value="listening_homework">listening_homework</option>
            <option value="file_homework">file_homework</option>
          </select>
          <select value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)}>
            <option value="all">All students</option>
            {studentOptions.map((studentName) => (
              <option key={studentName} value={studentName}>
                {studentName}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="card">
        <div className="table-scroll">
          <table className="result-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Homework</th>
                <th>Type</th>
                <th>Score</th>
                <th>Band</th>
                <th>Submitted</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((submission) => (
                <tr key={submission.id}>
                  <td data-label="Student">{submission.studentName}</td>
                  <td data-label="Homework">{submission.title}</td>
                  <td data-label="Type">{submission.homeworkType}</td>
                  <td data-label="Score">
                    {submission.score}/{submission.total}
                  </td>
                  <td data-label="Band">{submission.band ?? "-"}</td>
                  <td data-label="Submitted">
                    {new Date(submission.submittedAt).toLocaleDateString()}
                  </td>
                  <td data-label="Detail">
                    <button
                      className="secondary-button"
                      onClick={() => setSelectedSubmission(submission)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        isOpen={Boolean(selectedSubmission)}
        title={selectedSubmission?.title || "Submission"}
        onClose={() => setSelectedSubmission(null)}
      >
        {selectedSubmission ? (
          <div className="modal-card__content">
            <ScoreSummary
              title="Submission summary"
              score={selectedSubmission.score}
              total={selectedSubmission.total}
              percentage={selectedSubmission.percentage}
              band={selectedSubmission.band}
            />
            <CriteriaBreakdown criteria={selectedSubmission.criteria} />
            <WrongAnswersList items={selectedSubmission.wrongAnswers} emptyText="Noto'g'ri javoblar yo'q." />
            <FeedbackCard title="Homework AI feedback" feedback={selectedSubmission.feedback} />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export default TeacherHomeworkSubmissionsPage;
