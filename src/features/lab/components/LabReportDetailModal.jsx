import { printLabReport } from '@/features/lab/utils/labReportUtils';
import {
  useLabReportQuery,
  useDownloadLabReportFileMutation,
} from '@/shared/hooks/queries/useLabQuery';
import { QueryFeedback } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';

/** Full-screen detail — used only on Completed Reports archive page */
export default function LabReportDetailModal({ report, onClose }) {
  const reportDbId = report?.reportDbId;
  const detailQuery = useLabReportQuery(reportDbId, { enabled: reportDbId != null });
  const downloadFile = useDownloadLabReportFileMutation();

  if (!report) return null;

  const detail = detailQuery.data;
  const display = detail ?? report;

  const handleDownload = async () => {
    if (!reportDbId) return;
    try {
      const { blob, fileName } = await downloadFile.mutateAsync(reportDbId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('No file available for this report');
    }
  };

  return (
    <div className="lab-modal-overlay lab-report-view-overlay" onClick={onClose} role="presentation">
      <div
        className="lab-modal lab-report-view"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lab-report-modal-title"
      >
        <button type="button" className="lab-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <header className="lab-report-view__header">
          <p className="lab-report-view__eyebrow">Report archive</p>
          <h2 id="lab-report-modal-title">Report Details — {display.reportId}</h2>
        </header>

        <div className="lab-report-view__body">
          <QueryFeedback
            isLoading={detailQuery.isLoading}
            isError={detailQuery.isError}
            error={detailQuery.error}
            onRetry={detailQuery.refetch}
          >
            <div className="lab-info-panel lab-report-view__panel">
              <div className="lab-info-grid lab-report-view__grid">
                <div className="lab-info-item">
                  <label>Patient Name</label>
                  <span>{display.patientName}</span>
                </div>
                <div className="lab-info-item">
                  <label>Patient ID</label>
                  <span className="lab-report-view__mono">{display.patientId}</span>
                </div>
                <div className="lab-info-item">
                  <label>Test Name</label>
                  <span>{display.testName}</span>
                </div>
                <div className="lab-info-item">
                  <label>Doctor</label>
                  <span>{display.doctorName ?? '—'}</span>
                </div>
                <div className="lab-info-item">
                  <label>Lab Technician</label>
                  <span>{display.uploadedByName ?? '—'}</span>
                </div>
                <div className="lab-info-item">
                  <label>Uploaded</label>
                  <span>{display.uploadedDate}</span>
                </div>
                <div className="lab-info-item">
                  <label>Status</label>
                  <span>
                    <span className="lab-badge completed">Completed</span>
                  </span>
                </div>
                <div className="lab-info-item lab-report-view__remarks">
                  <label>Remarks</label>
                  <span>{detail?.remarks?.trim() ? detail.remarks : '—'}</span>
                </div>
              </div>

              {detail?.parameters?.length > 0 ? (
                <div className="lab-report-view__params">
                  <h3 className="lab-report-view__params-title">Parameters</h3>
                  <div className="lab-report-view__params-wrap">
                    <table className="lab-params-table lab-report-view__params-table">
                      <thead>
                        <tr>
                          <th>Parameter</th>
                          <th>Value</th>
                          <th>Unit</th>
                          <th>Range</th>
                          <th>Flag</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.parameters.map((p) => (
                          <tr key={p.parameter_name}>
                            <td>{p.parameter_name}</td>
                            <td>{p.value}</td>
                            <td>{p.unit}</td>
                            <td>{p.normal_range}</td>
                            <td>{p.flag}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          </QueryFeedback>
        </div>

        <div className="lab-form-actions lab-report-view__actions">
          <button type="button" className="lab-btn lab-btn-primary" onClick={() => printLabReport(display)}>
            Print Report
          </button>
          {(detail?.fileName || report.hasFile) && (
            <button
              type="button"
              className="lab-btn lab-btn-secondary"
              onClick={handleDownload}
              disabled={downloadFile.isPending}
            >
              {downloadFile.isPending ? 'Downloading...' : 'Download File'}
            </button>
          )}
          <button type="button" className="lab-btn lab-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
