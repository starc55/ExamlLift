function PDFViewer({ src, title }) {
  return (
    <div className="pdf-viewer">
      <div className="pdf-viewer__header">
        <h4>{title}</h4>
        <a href={src} target="_blank" rel="noreferrer">
          Open in new tab
        </a>
      </div>
      <iframe src={src} title={title} className="pdf-viewer__frame" />
    </div>
  );
}

export default PDFViewer;
