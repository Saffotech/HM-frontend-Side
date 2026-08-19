import { useEffect, useState } from 'react';
import {
  useLabReportQuery,
  useUploadLabReportFileMutation,
} from '@/shared/hooks/queries/useLabQuery';
import { useLabPermissionSet } from '@/features/lab/hooks/useLabPermission';
import LabLocalFilePreviewModal from '@/features/lab/components/LabLocalFilePreviewModal';
import LabEncounterBadge from '@/features/lab/components/LabEncounterBadge';
import { visitLocationLabel } from '@/features/lab/utils/visitLocation';
import { QueryFeedback } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';

/** Archive edit — add or replace the uploaded report file. */
export default function LabReportEditModal({ report, onClose }) {
  const { canUploadReport } = useLabPermissionSet();
  const reportDbId = report?.reportDbId;
  const detailQuery = useLabReportQuery(reportDbId, { enabled: reportDbId != null });
  const uploadFile = useUploadLabReportFileMutation();

  const [file, setFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [fileError, setFileError] = useState('');

  const detail = detailQuery.data;
  const display = detail ?? report;
  const location = visitLocationLabel(display);
  const orderId = display?.orderId ?? report?.orderId;
  const existingFileName = detail?.fileName ?? (report?.hasFile ? 'Uploaded file' : null);

  useEffect(() => {
    setFile(null);
    setShowPreview(false);
    setFileError('');
  }, [reportDbId]);

  if (!report) return null;

  const handleSave = async () => {
    if (!canUploadReport) {
      toast.error('You do not have permission to upload lab reports');
      return;
    }
    if (!file) {
      setFileError('Select a report file to upload');
      toast.error('Select a report file to upload');
      return;
    }
    if (orderId == null) {
      toast.error('This report cannot be updated because the order is missing');
      return;
    }

    try {
      await uploadFile.mutateAsync({ orderId, file });
      toast.success('Report file saved');
      onClose();
    } catch {
      // mutationOnError handles toast
    }
  };

  return (
    <>
      <div className="lab-modal-overlay lab-report-view-overlay" onClick={onClose} role="presentation">
        <div
          className="lab-modal lab-report-view"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lab-report-edit-title"
        >
          <button type="button" className="lab-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>

          <header className="lab-report-view__header">
            <p className="lab-report-view__eyebrow">Report archive</p>
            <h2 id="lab-report-edit-title">Edit Report — {display.reportId}</h2>
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
                    <label>Ward / Bed</label>
                    <span>
                      {location.visit === 'IPD' ? `${location.ward} / ${location.bed}` : '-'}
                    </span>
                  </div>
                  <div className="lab-info-item">
                    <label>Test Name</label>
                    <span>{display.testName}</span>
                  </div>
                  <div className="lab-info-item">
                    <label>Doctor</label>
                    <span>{display.doctorName ?? '—'}</span>
                  </div>
                </div>

                <div className="lab-field lab-report-edit__file">
                  <label htmlFor="archive-report-file">
                    Report File
                    <span className="required"> *</span>
                    <small style={{ fontWeight: 400, color: '#8a9ab5', marginLeft: 6 }}>
                      (PDF, PNG, JPG)
                    </small>
                  </label>
                  {existingFileName ? (
                    <p className="text-muted lab-report-edit__current">
                      Current file: {existingFileName}
                    </p>
                  ) : (
                    <p className="text-muted lab-report-edit__current">No report file uploaded yet.</p>
                  )}
                  <input
                    id="archive-report-file"
                    type="file"
                    accept=".pdf,image/*"
                    disabled={!canUploadReport || uploadFile.isPending}
                    aria-invalid={Boolean(fileError)}
                    className={fileError ? 'is-invalid' : undefined}
                    onChange={(e) => {
                      setFile(e.target.files?.[0] ?? null);
                      setFileError('');
                    }}
                  />
                  {fileError ? <small className="lab-param-field-error">{fileError}</small> : null}
                  {file ? (
                    <button
                      type="button"
                      className="lab-upload-file-link"
                      onClick={() => setShowPreview(true)}
                    >
                      ✓ {file.name}
                    </button>
                  ) : null}
                  {!canUploadReport ? (
                    <small className="lab-param-field-error">
                      You do not have permission to upload report files.
                    </small>
                  ) : null}
                </div>
              </div>
            </QueryFeedback>
          </div>

          <div className="lab-form-actions lab-report-view__actions">
            <button
              type="button"
              className="lab-btn lab-btn-primary"
              onClick={handleSave}
              disabled={uploadFile.isPending || !canUploadReport}
            >
              {uploadFile.isPending ? 'Saving...' : 'Save File'}
            </button>
            <button
              type="button"
              className="lab-btn lab-btn-secondary"
              onClick={onClose}
              disabled={uploadFile.isPending}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {showPreview && file ? (
        <LabLocalFilePreviewModal file={file} onClose={() => setShowPreview(false)} />
      ) : null}
    </>
  );
}
