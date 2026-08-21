import { useEffect, useState } from 'react';
import { printLabReport } from '@/features/lab/utils/labReportUtils';
import {
  useLabReportQuery,
  useDownloadLabReportFileMutation,
} from '@/shared/hooks/queries/useLabQuery';
import { QueryFeedback } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import LabEncounterBadge from '@/features/lab/components/LabEncounterBadge';
import { visitLocationLabel } from '@/features/lab/utils/visitLocation';

function resolvePreviewKind(fileType, fileName) {
  const mime = String(fileType ?? '').toLowerCase();
  const name = String(fileName ?? '').toLowerCase();

  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) return 'image';
  if (name.endsWith('.pdf')) return 'pdf';
  return 'other';
}

/** Full-screen detail — used only on Completed Reports archive page */
export default function LabReportDetailModal({ report, onClose }) {
  const reportDbId = report?.reportDbId;
  const detailQuery = useLabReportQuery(reportDbId, { enabled: reportDbId != null });
  const downloadFile = useDownloadLabReportFileMutation();
  const [preview, setPreview] = useState({
    url: null,
    fileName: null,
    fileType: null,
    error: null,
    loading: false,
  });

  const detail = detailQuery.data;
  const display = detail ?? report;

  useEffect(() => {
    let active = true;
    let objectUrl = null;

    if (reportDbId == null || !(detail?.fileName || report.hasFile)) {
      setPreview({ url: null, fileName: null, fileType: null, error: null, loading: false });
      return () => {};
    }

    setPreview((prev) => ({ ...prev, loading: true, error: null }));

    downloadFile
      .mutateAsync(reportDbId)
      .then(({ blob, fileName, contentType }) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({
          url: objectUrl,
          fileName,
          fileType: contentType ?? blob.type ?? '',
          error: null,
          loading: false,
        });
      })
      .catch(() => {
        if (!active) return;
        setPreview({
          url: null,
          fileName: detail?.fileName ?? null,
          fileType: detail?.fileType ?? null,
          error: 'Could not load the uploaded file preview.',
          loading: false,
        });
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [reportDbId, detail?.fileName, detail?.fileType, report?.hasFile]);

  if (!report) return null;

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

  const previewKind = resolvePreviewKind(preview.fileType, preview.fileName);
  const location = visitLocationLabel(display);

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
                  <label>Source</label>
                  <span>
                    <LabEncounterBadge encounterType={display.encounterType} />
                  </span>
                </div>
                <div className="lab-info-item">
                  <label>Ward</label>
                  <span>{location.ward}</span>
                </div>
                <div className="lab-info-item">
                  <label>Bed</label>
                  <span>{location.bed}</span>
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

              {(detail?.fileName || report.hasFile) && (
                <div className="lab-report-view__file">
                  <h3 className="lab-report-view__params-title">Uploaded Report File</h3>
                  <div className="lab-report-view__file-wrap">
                    {preview.loading ? (
                      <p className="text-muted">Loading uploaded file…</p>
                    ) : preview.error ? (
                      <p className="field__error">{preview.error}</p>
                    ) : preview.url && previewKind === 'image' ? (
                      <img
                        src={preview.url}
                        alt={preview.fileName ?? 'Uploaded report file'}
                        className="lab-report-view__file-image"
                      />
                    ) : preview.url && previewKind === 'pdf' ? (
                      <iframe
                        src={preview.url}
                        title={preview.fileName ?? 'Uploaded report PDF'}
                        className="lab-report-view__file-frame"
                      />
                    ) : (
                      <p className="text-muted">
                        Preview is not available for this file type. Use Download File.
                      </p>
                    )}
                  </div>
                </div>
              )}
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
