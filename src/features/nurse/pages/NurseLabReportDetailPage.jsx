import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FlaskConical, User } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import { QueryFeedback } from '@/shared/components/common';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
import {
  useNurseLabReportQuery,
  useDownloadNurseLabReportFileMutation,
  useNurseActiveDoctorsQuery,
} from '@/shared/hooks/queries/useNurseQuery';
import { useNursePatientScope } from '@/features/nurse/context/NursePatientScopeContext';
import { toast } from '@/shared/utils/toast';
import { ROUTES } from '@/shared/constants';

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function flagBadgeClass(flag) {
  const key = String(flag ?? '').toLowerCase();
  if (key === 'low') return 'nurse-badge--delayed';
  if (key === 'high') return 'nurse-badge--missed';
  if (key === 'normal') return 'nurse-badge--completed';
  return 'nurse-badge--draft';
}

function resolvePreviewKind(fileType, fileName) {
  const mime = String(fileType ?? '').toLowerCase();
  const name = String(fileName ?? '').toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) return 'image';
  if (name.endsWith('.pdf')) return 'pdf';
  return 'other';
}

async function triggerBlobDownload({ blob, fileName }) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export default function NurseLabReportDetailPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { canViewLabReports } = useNursePermissionSet();
  const { scopeFilters, scopeReady } = useNursePatientScope();
  const downloadMutation = useDownloadNurseLabReportFileMutation();
  const [preview, setPreview] = useState({
    url: null,
    fileName: null,
    fileType: null,
    error: null,
    loading: false,
  });

  const detailFilters = useMemo(() => ({ ...scopeFilters }), [scopeFilters]);

  const { data: report, isLoading, isError, error, refetch } = useNurseLabReportQuery(
    reportId,
    detailFilters,
    { enabled: scopeReady && canViewLabReports && Boolean(reportId) },
  );

  const { data: doctorsData } = useNurseActiveDoctorsQuery(
    { page: 1, page_size: 100 },
    { enabled: scopeReady && canViewLabReports },
  );

  const doctorDepartment = useMemo(() => {
    if (report?.department_name || report?.department) {
      return String(report.department_name || report.department).trim();
    }
    const doctorId = Number(report?.doctor_id);
    if (!Number.isSafeInteger(doctorId) || doctorId < 1) return '';
    for (const doc of doctorsData?.doctors ?? []) {
      if (Number(doc.id) === doctorId) {
        return String(doc.specialization || '').trim();
      }
    }
    return '';
  }, [report?.department_name, report?.department, report?.doctor_id, doctorsData?.doctors]);

  useEffect(() => {
    let active = true;
    let objectUrl = null;

    if (!reportId || !report?.has_file || !canViewLabReports || !scopeReady) {
      setPreview({ url: null, fileName: null, fileType: null, error: null, loading: false });
      return undefined;
    }

    setPreview((prev) => ({ ...prev, loading: true, error: null }));

    downloadMutation
      .mutateAsync({ reportId, ...scopeFilters })
      .then(({ blob, fileName, contentType }) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({
          url: objectUrl,
          fileName: fileName || report.file_name || `lab-report-${reportId}`,
          fileType: contentType || blob.type || report.file_type || '',
          error: null,
          loading: false,
        });
      })
      .catch(() => {
        if (!active) return;
        setPreview({
          url: null,
          fileName: report.file_name ?? null,
          fileType: report.file_type ?? null,
          error: 'Could not load the report file preview.',
          loading: false,
        });
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // Intentionally depend on report identity/file fields, not the mutation object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    reportId,
    report?.has_file,
    report?.file_name,
    report?.file_type,
    canViewLabReports,
    scopeReady,
    scopeFilters,
  ]);

  const handleDownload = useCallback(async () => {
    if (!reportId || !report?.has_file) return;
    try {
      if (preview.url && preview.fileName) {
        const a = document.createElement('a');
        a.href = preview.url;
        a.download = preview.fileName;
        a.click();
        return;
      }
      const result = await downloadMutation.mutateAsync({
        reportId,
        ...scopeFilters,
      });
      await triggerBlobDownload(result);
    } catch {
      toast.error('No file');
    }
  }, [reportId, report?.has_file, downloadMutation, scopeFilters, preview.url, preview.fileName]);

  if (!canViewLabReports) {
    return (
      <NurseLayout>
        <div className="nurse-page">
          <div className="nurse-alert nurse-alert--error">
            You do not have permission to view lab reports.
          </div>
        </div>
      </NurseLayout>
    );
  }

  const parameters = report?.parameters ?? [];
  const notFound = isError && (error?.status === 404 || /not found/i.test(error?.message ?? ''));
  const previewKind = resolvePreviewKind(
    preview.fileType || report?.file_type,
    preview.fileName || report?.file_name,
  );

  return (
    <NurseLayout>
      <div className="nurse-page nurse-lab-report-detail">
        <QueryFeedback
          isLoading={isLoading}
          isError={isError && !notFound}
          error={error}
          onRetry={refetch}
        >
          {notFound || (!isLoading && !report) ? (
            <div className="nurse-alert nurse-alert--error">Report not found.</div>
          ) : report ? (
            <div className="nurse-note-detail">
              <div className="nurse-vital-detail__top">
                <div className="nurse-vital-detail__identity">
                  <div className="nurse-note-detail__avatar" aria-hidden>
                    <User size={28} />
                  </div>
                  <div>
                    <h1 className="nurse-vital-detail__name">{report.patient_name || 'Unknown Patient'}</h1>
                    <p className="nurse-vital-detail__meta-line">
                      <span>
                        Patient ID: <strong>{formatPatientIdDisplay(report)}</strong>
                      </span>
                      <span className="nurse-vital-detail__dot" aria-hidden>·</span>
                      <span>
                        Ward: <strong>{report.ward_name || '—'}</strong>
                      </span>
                      <span className="nurse-vital-detail__dot" aria-hidden>·</span>
                      <span>
                        Bed: <strong>{report.bed_number || '—'}</strong>
                      </span>
                      <span className="nurse-vital-detail__dot" aria-hidden>·</span>
                      <span>
                        Doctor: <strong>{report.doctor_name || '—'}</strong>
                      </span>
                      <span className="nurse-vital-detail__dot" aria-hidden>·</span>
                      <span>
                        Department: <strong>{doctorDepartment || '—'}</strong>
                      </span>
                    </p>
                  </div>
                </div>
                <div className="nurse-vital-detail__actions">
                  <button
                    type="button"
                    className="nurse-btn nurse-btn--secondary"
                    onClick={() => navigate(ROUTES.NURSE_LAB_REPORTS)}
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                  {report.has_file ? (
                    <button
                      type="button"
                      className="nurse-btn nurse-btn--primary"
                      onClick={handleDownload}
                      disabled={downloadMutation.isPending && !preview.url}
                    >
                      <Download size={16} />
                      {downloadMutation.isPending && !preview.url ? 'Loading…' : 'Download'}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="nurse-card nurse-lab-report-detail__summary">
                <div className="nurse-lab-report-detail__summary-title">
                  <FlaskConical size={18} aria-hidden />
                  <h2>{report.test_name || 'Lab report'}</h2>
                </div>
                <dl className="nurse-lab-report-detail__meta-grid">
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <span className={`nurse-badge nurse-badge--${String(report.order_status || report.status || 'completed').toLowerCase()}`}>
                        {report.order_status || report.status || 'completed'}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Category</dt>
                    <dd>{report.category || '—'}</dd>
                  </div>
                  <div>
                    <dt>Priority</dt>
                    <dd>{report.priority || '—'}</dd>
                  </div>
                  <div>
                    <dt>Reported at</dt>
                    <dd>{formatDateTime(report.uploaded_at)}</dd>
                  </div>
                  <div>
                    <dt>Uploaded by</dt>
                    <dd>{report.uploaded_by_name || '—'}</dd>
                  </div>
                  <div>
                    <dt>Sample collected</dt>
                    <dd>{formatDateTime(report.sample_collected_at)}</dd>
                  </div>
                  <div>
                    <dt>Test performed</dt>
                    <dd>{formatDateTime(report.test_performed_at)}</dd>
                  </div>
                  {report.file_name ? (
                    <div>
                      <dt>File</dt>
                      <dd>
                        {report.file_name}
                        {report.file_size_display ? ` (${report.file_size_display})` : ''}
                      </dd>
                    </div>
                  ) : null}
                  {report.remarks ? (
                    <div className="nurse-lab-report-detail__remarks">
                      <dt>Remarks</dt>
                      <dd>{report.remarks}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              {parameters.length > 0 ? (
                <div className="nurse-card nurse-lab-report-detail__params">
                  <h3 className="nurse-lab-report-detail__params-title">Parameters</h3>
                  <div className="nurse-lab-report-detail__params-wrap">
                    <table className="nurse-table nurse-lab-report-detail__params-table">
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
                        {parameters.map((p) => (
                          <tr key={p.id ?? p.parameter_name}>
                            <td>{p.parameter_name || '—'}</td>
                            <td>{p.value ?? '—'}</td>
                            <td>{p.unit || '—'}</td>
                            <td>{p.normal_range || '—'}</td>
                            <td>
                              {p.flag ? (
                                <span className={`nurse-badge ${flagBadgeClass(p.flag)}`}>
                                  {p.flag}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {report.has_file ? (
                <div className="nurse-card nurse-lab-report-detail__file">
                  <h3 className="nurse-lab-report-detail__params-title">Report file</h3>
                  <div className="nurse-lab-report-detail__file-wrap">
                    {preview.loading ? (
                      <p className="nurse-lab-report-detail__file-muted">Loading report file…</p>
                    ) : preview.error ? (
                      <p className="nurse-lab-report-detail__file-error">{preview.error}</p>
                    ) : preview.url && previewKind === 'image' ? (
                      <img
                        src={preview.url}
                        alt={preview.fileName || 'Lab report file'}
                        className="nurse-lab-report-detail__file-image"
                      />
                    ) : preview.url && previewKind === 'pdf' ? (
                      <iframe
                        src={preview.url}
                        title={preview.fileName || 'Lab report PDF'}
                        className="nurse-lab-report-detail__file-frame"
                      />
                    ) : (
                      <p className="nurse-lab-report-detail__file-muted">
                        Preview is not available for this file type. Use Download to open the file.
                      </p>
                    )}
                  </div>
                </div>
              ) : parameters.length === 0 ? (
                <div className="nurse-card nurse-lab-report-detail__file-only">
                  <p>No parameters or file available for this report.</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </QueryFeedback>
      </div>
    </NurseLayout>
  );
}
