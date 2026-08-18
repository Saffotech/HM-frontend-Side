import { useEffect, useState } from 'react';

function resolvePreviewKind(file) {
  const mime = String(file?.type ?? '').toLowerCase();
  const name = String(file?.name ?? '').toLowerCase();

  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) return 'image';
  if (name.endsWith('.pdf')) return 'pdf';
  return 'other';
}

/** Preview a local File (before upload) — images and PDFs. */
export default function LabLocalFilePreviewModal({ file, onClose }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const previewKind = resolvePreviewKind(file);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return () => {};
    }

    const nextUrl = URL.createObjectURL(file);
    setObjectUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [file]);

  if (!file || !objectUrl) return null;

  const isImage = previewKind === 'image';
  const isPdf = previewKind === 'pdf';

  return (
    <div className="lab-modal-overlay lab-report-view-overlay" onClick={onClose} role="presentation">
      <div
        className="lab-modal lab-report-view"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lab-local-file-preview-title"
      >
        <button type="button" className="lab-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <header className="lab-report-view__header">
          <p className="lab-report-view__eyebrow">Report file preview</p>
          <h2 id="lab-local-file-preview-title">{file.name}</h2>
        </header>

        <div className="lab-report-view__body">
          <div className="lab-report-view__file-wrap">
            {isImage ? (
              <img
                src={objectUrl}
                alt={file.name}
                className="lab-report-view__file-image"
              />
            ) : isPdf ? (
              <iframe
                src={objectUrl}
                title={file.name}
                className="lab-report-view__file-frame"
              />
            ) : (
              <p className="text-muted">Preview is not available for this file type.</p>
            )}
          </div>
        </div>

        <div className="lab-form-actions lab-report-view__actions">
          <button type="button" className="lab-btn lab-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
