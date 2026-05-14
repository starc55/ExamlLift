import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardCard from "../../components/dashboard/DashboardCard";
import ErrorAlert from "../../components/feedback/ErrorAlert";
import ResultTable from "../../components/dashboard/ResultTable";
import TestCard from "../../components/cards/TestCard";
import { getClassById } from "../../services/classes/classService";
import { getClassContents } from "../../services/content/contentService";
import { getStudentTestsByClass } from "../../services/tests/testService";
import { getTeacherClassResults } from "../../services/results/resultService";

function TeacherClassDetailPage() {
  const { id } = useParams();
  const [classItem, setClassItem] = useState(null);
  const [contents, setContents] = useState([]);
  const [tests, setTests] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadClassData() {
      setLoading(true);
      setError("");

      try {
        const [nextClass, nextContents, nextTests, nextResults] = await Promise.all([
          getClassById(id),
          getClassContents(id),
          getStudentTestsByClass(id),
          getTeacherClassResults({ classId: id }),
        ]);

        if (!isMounted) {
          return;
        }

        setClassItem(nextClass);
        setContents(nextContents);
        setTests(nextTests);
        setResults(nextResults);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    loadClassData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(classItem.inviteCode);
    setMessage(`Invite code copied: ${classItem.inviteCode}`);
  };

  if (loading) {
    return <p className="empty-copy">Loading class...</p>;
  }

  if (!classItem) {
    return (
      <section className="card empty-state">
        <h3>Class not found</h3>
        <ErrorAlert message={error} />
        <Link to="/teacher/classes" className="primary-button card-link">
          Back to classes
        </Link>
      </section>
    );
  }

  return (
    <div className="page-stack">
      <Link to="/teacher/classes" className="text-link">
        Back to classes
      </Link>

      <section className="hero-card hero-card--blue">
        <div>
          <p className="eyebrow">Class workspace</p>
          <h3>{classItem.title}</h3>
          <p>{classItem.description || "No class description yet."}</p>
          <div className="hero-card__actions">
            <button className="primary-button" type="button" onClick={handleCopy}>
              Copy {classItem.inviteCode}
            </button>
            <Link to="/teacher/upload-content" className="secondary-button">
              Upload content
            </Link>
            <Link to="/teacher/manage-tests" className="secondary-button">
              Manage tests
            </Link>
          </div>
        </div>
        <div className="hero-card__stats">
          <DashboardCard label="Students" value={classItem.studentCount} helper="Joined users" />
          <DashboardCard label="Content" value={contents.length} helper="Published lessons" tone="info" />
          <DashboardCard label="Results" value={results.length} helper="Saved attempts" tone="success" />
        </div>
      </section>

      <ErrorAlert message={error} />
      {message ? <p className="success-text">{message}</p> : null}

      <section className="card assignment-review">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Students</p>
            <h2>Joined students</h2>
          </div>
        </div>
        <div className="assignment-list">
          {classItem.students.length ? (
            classItem.students.map((student) => (
              <article key={student.id} className="assignment-item">
                <div className="assignment-item__top">
                  <div>
                    <strong>{student.profiles?.full_name || "Student"}</strong>
                    <p>{student.profiles?.email || "-"}</p>
                  </div>
                  <span className="pill pill--soft">
                    {new Date(student.joined_at).toLocaleDateString()}
                  </span>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">
              <h3>No students yet</h3>
              <p>Share the invite code with students so they can join.</p>
            </div>
          )}
        </div>
      </section>

      <section className="dashboard-grid dashboard-grid--features">
        <TestCard title="Class content" description="Lessons visible to joined students." stats={`${contents.length} items`}>
          <Link to="/teacher/upload-content" className="primary-button card-link">
            Add content
          </Link>
        </TestCard>
        <TestCard title="Class tests" description="Assessments assigned to this class." stats={`${tests.length} tests`}>
          <Link to="/teacher/manage-tests" className="primary-button card-link">
            Add tests
          </Link>
        </TestCard>
      </section>

      <section className="section-heading">
        <div>
          <p className="eyebrow">Results</p>
          <h2>Class result feed</h2>
        </div>
      </section>
      <ResultTable results={results} />
    </div>
  );
}

export default TeacherClassDetailPage;
