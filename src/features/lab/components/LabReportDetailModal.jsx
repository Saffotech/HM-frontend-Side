import { printLabReport } from '@/features/lab/utils/labReportUtils';

/** Full-screen detail — used only on Completed Reports archive page */
export default function LabReportDetailModal({ report, onClose }) {
  if (!report) return null;

  return (
    <div className="lab-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="lab-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lab-report-modal-title"
      >
        <button type="button" className="lab-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2 id="lab-report-modal-title">Report Details — {report.reportId}</h2>
        <div className="lab-info-panel" style={{ marginBottom: 0 }}>
          <div className="lab-info-grid">
            <div className="lab-info-item">
              <label>Patient Name</label>
              <span>{report.patientName}</span>
            </div>
            <div className="lab-info-item">
              <label>Patient ID</label>
              <span>{report.patientId}</span>
            </div>
            <div className="lab-info-item">
              <label>Test Name</label>
              <span>{report.testName}</span>
            </div>
            <div className="lab-info-item">
              <label>Doctor</label>
              <span>{report.doctorName}</span>
            </div>
            <div className="lab-info-item">
              <label>Uploaded</label>
              <span>{report.uploadedDate}</span>
            </div>
            <div className="lab-info-item">
              <label>Status</label>
              <span>
                <span className="lab-badge completed">✓ Completed</span>
              </span>
            </div>
          </div>
        </div>
        <div className="lab-form-actions" style={{ marginTop: 20 }}>
          <button type="button" className="lab-btn lab-btn-primary" onClick={() => printLabReport(report)}>
            Print Report
          </button>
          <button type="button" className="lab-btn lab-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
