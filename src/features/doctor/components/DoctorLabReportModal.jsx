import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import {
  useDoctorLabReportQuery,
  useDownloadDoctorLabReportFileMutation,
} from '@/features/doctor/hooks/useDoctorLabQuery';
import { Modal, Button, QueryFeedback } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import StatusPill from './StatusPill';
import '../styles/doctor-ui.css';

function formatReportDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function isImageFile(fileName, fileType) {
  if (fileType && /^image\//i.test(fileType)) return true;
  return /\.(jpe?g|png|gif|webp|bmp)$/i.test(fileName ?? '');
}

function isPdfFile(fileName, fileType) {
  if (fileType && /pdf/i.test(fileType)) return true;
  return /\.pdf$/i.test(fileName ?? '');
}

export default function DoctorLabReportModal({ test, open, onClose }) {
  const isCompleted = test?.apiStatus === 'completed' || test?.status === 'Completed';
  const reportQuery = useDoctorLabReportQuery(test?.id, {
    enabled: open && isCompleted && test?.id != null,
  });
  const downloadFile = useDownloadDoctorLabReportFileMutation();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewError, setPreviewError] = useState(null);

  const report = reportQuery.data;
  const fileName = report?.fileName ?? null;
  const fileType = report?.fileType ?? null;
  const showImagePreview = isImageFile(fileName, fileType);
  const showPdfNote = isPdfFile(fileName, fileType);

  useEffect(() => {
    if (!open || !isCompleted || !test?.id || !report || !showImagePreview) {
      setPreviewUrl(null);
      setPreviewError(null);
      return undefined;
    }

    let active = true;
    let objectUrl = null;

    downloadFile
      .mutateAsync(test.id)
      .then(({ blob, contentType }) => {
        if (!active) return;
        const type = contentType || blob.type || 'image/jpeg';
        objectUrl = URL.createObjectURL(new Blob([blob], { type }));
        setPreviewUrl(objectUrl);
        setPreviewError(null);
      })
      .catch((err) => {
        if (!active) return;
        setPreviewError(err?.message ?? 'Could not load image preview');
        setPreviewUrl(null);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, isCompleted, test?.id, report, showImagePreview, downloadFile]);

  const summary = useMemo(() => {
    if (report) return report;
    if (!test) return null;
    return {
      testName: test.testName,
      patientName: test.patientName,
      patientId: test.patientId,
      category: test.category,
      priority: test.priority,
      orderStatus: test.status,
      remarks: test.clinicalNotes,
      uploadedAt: test.orderedAt,
      parameters: [],
    };
  }, [report, test]);

  if (!test) return null;

  const handleDownload = async () => {
    if (!test.id) return;
    try {
      const { blob, fileName: name } = await downloadFile.mutateAsync(test.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = name;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err?.message ?? 'No file available for this report');
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={`Lab Report — ${test.testName}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {isCompleted && (
            <Button
              variant="outline"
              disabled={downloadFile.isPending}
              onClick={handleDownload}
            >
              <Download size={14} aria-hidden />
              {downloadFile.isPending ? 'Downloading…' : 'Download file'}
            </Button>
          )}
        </>
      }
    >
      <div className="doc-lab-report-modal">
        <div className="doc-lab-report-modal__meta">
          <div>
            <span className="doc-lab-report-modal__label">Patient</span>
            <strong>{summary?.patientName ?? test.patientName}</strong>
            <span className="text-muted">{summary?.patientId ?? test.patientId}</span>
          </div>
          <div>
            <span className="doc-lab-report-modal__label">Status</span>
            <StatusPill status={test.doctorStatus ?? test.status} />
          </div>
          <div>
            <span className="doc-lab-report-modal__label">Category</span>
            <span>{summary?.category ?? test.category}</span>
          </div>
          <div>
            <span className="doc-lab-report-modal__label">Ordered</span>
            <span>{test.orderedDisplay}</span>
          </div>
        </div>

        {!isCompleted ? (
          <p className="text-muted doc-lab-report-modal__pending">
            Lab work is still in progress. Open this again after the technician marks the test completed.
          </p>
        ) : (
          <QueryFeedback
            isLoading={reportQuery.isLoading}
            isError={reportQuery.error?.status === 404 ? false : reportQuery.isError}
            error={reportQuery.error?.status === 404 ? null : reportQuery.error}
            onRetry={reportQuery.refetch}
          >
            {reportQuery.error?.status === 404 ? (
              <p className="text-muted">Report details are not available yet.</p>
            ) : null}

            {summary?.uploadedByName && summary.uploadedByName !== '—' ? (
              <p className="doc-lab-report-modal__uploader text-muted">
                Uploaded by {summary.uploadedByName}
                {summary.uploadedAt ? ` · ${formatReportDate(summary.uploadedAt)}` : ''}
              </p>
            ) : null}

            {summary?.remarks ? (
              <div className="doc-lab-report-modal__section">
                <h4>Remarks</h4>
                <p>{summary.remarks}</p>
              </div>
            ) : null}

            {summary?.parameters?.length > 0 ? (
              <div className="doc-lab-report-modal__section">
                <h4>Results</h4>
                <div className="table-wrap">
                  <table className="data-table doc-lab-report-modal__table">
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
                      {summary.parameters.map((row) => (
                        <tr key={row.id ?? row.parameter_name}>
                          <td>{row.parameter_name}</td>
                          <td>{row.value || '—'}</td>
                          <td>{row.unit || '—'}</td>
                          <td>{row.normal_range || '—'}</td>
                          <td>{row.flag || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {showImagePreview ? (
              <div className="doc-lab-report-modal__section">
                <h4>Uploaded image</h4>
                {downloadFile.isPending && !previewUrl ? (
                  <p className="text-muted">Loading preview…</p>
                ) : null}
                {previewError ? (
                  <p className="text-muted">{previewError}</p>
                ) : null}
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={`Lab report for ${test.testName}`}
                    className="doc-lab-report-modal__preview"
                  />
                ) : null}
              </div>
            ) : null}

            {showPdfNote && fileName ? (
              <p className="text-muted doc-lab-report-modal__file-hint">
                PDF report: {fileName}. Use Download file to open it.
              </p>
            ) : null}

            {!fileName && !summary?.parameters?.length && !summary?.remarks && reportQuery.error?.status !== 404 ? (
              <p className="text-muted">No report details uploaded yet.</p>
            ) : null}
          </QueryFeedback>
        )}
      </div>
    </Modal>
  );
}
