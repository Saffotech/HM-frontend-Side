import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, X } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import NursePagination from '@/features/nurse/components/NursePagination';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
import { QueryFeedback, DateInput } from '@/shared/components/common';
import {
  useNurseLabReportsQuery,
  useDownloadNurseLabReportFileMutation,
  useNurseActiveDoctorsQuery,
} from '@/shared/hooks/queries/useNurseQuery';
import { useNursePatientScope } from '@/features/nurse/context/NursePatientScopeContext';
import NursePatientAllocationTags from '@/features/nurse/components/NursePatientAllocationTags';
import { useAuth } from '@/shared/hooks/useAuth';
import { toast } from '@/shared/utils/toast';
import { ROUTES } from '@/shared/constants';
import './NurseMedicationPatientsPage.css';

const PAGE_SIZE = 20;
const FETCH_PAGE_SIZE = 100;
const WARD_OPTIONS = ['ICU', 'Private', 'General'];

function formatReportedAtParts(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: d.toLocaleDateString(),
    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

async function triggerBlobDownload({ blob, fileName }) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export default function NurseLabReportsRegistryPage() {
  const navigate = useNavigate();
  const { refreshPermissions } = useAuth();
  const { canViewLabReports } = useNursePermissionSet();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [ward, setWard] = useState('');
  const [reportedDate, setReportedDate] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);
  const {
    scopeFilters,
    scopeReady,
    allocatedOnly,
    allocationSummary,
  } = useNursePatientScope();
  const downloadMutation = useDownloadNurseLabReportFileMutation();

  const { data: doctorsData } = useNurseActiveDoctorsQuery(
    { page: 1, page_size: 100 },
    { enabled: scopeReady && canViewLabReports },
  );

  const doctorDepartmentMap = useMemo(() => {
    const map = new Map();
    for (const doc of doctorsData?.doctors ?? []) {
      map.set(Number(doc.id), String(doc.specialization || '').trim());
    }
    return map;
  }, [doctorsData?.doctors]);

  useEffect(() => {
    refreshPermissions?.();
  }, [refreshPermissions]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, ward, reportedDate, allocatedOnly]);

  const filters = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      page: 1,
      page_size: FETCH_PAGE_SIZE,
      ...(reportedDate ? { from_date: reportedDate, to_date: reportedDate } : {}),
      ...scopeFilters,
    }),
    [debouncedSearch, reportedDate, scopeFilters],
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useNurseLabReportsQuery(
    filters,
    { enabled: scopeReady && canViewLabReports },
  );

  const allRows = useMemo(() => {
    let items = data?.items ?? [];
    if (ward) {
      const wardKey = ward.toLowerCase();
      items = items.filter(
        (row) => String(row.ward_name || '').trim().toLowerCase() === wardKey,
      );
    }
    return items;
  }, [data?.items, ward]);

  const total = allRows.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = useMemo(
    () => allRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [allRows, safePage],
  );

  const hasFilters = Boolean(search.trim() || ward || reportedDate);

  const viewReport = useCallback((row) => {
    const id = row.report_id ?? row.id;
    if (id == null) return;
    navigate(ROUTES.NURSE_LAB_REPORT_DETAIL.replace(':reportId', String(id)), {
      state: { backTo: ROUTES.NURSE_LAB_REPORTS },
    });
  }, [navigate]);

  const downloadReport = useCallback(async (row, event) => {
    event?.stopPropagation?.();
    const reportId = row.report_id ?? row.id;
    if (!reportId || !row.has_file) return;
    try {
      const result = await downloadMutation.mutateAsync({
        reportId,
        ...scopeFilters,
      });
      await triggerBlobDownload(result);
    } catch {
      toast.error('No file');
    }
  }, [downloadMutation, scopeFilters]);

  const columns = useMemo(() => [
    {
      header: 'Patient ID',
      render: (row) => (
        <span className="nurse-notes-registry__id">{formatPatientIdDisplay(row)}</span>
      ),
    },
    {
      header: 'Patient Name',
      render: (row) => (
        <span className="nurse-patient-name-with-tags">
          <span className="nurse-notes-registry__name">{row.patient_name || '—'}</span>
          <NursePatientAllocationTags patientId={row.patient_id} />
        </span>
      ),
    },
    {
      header: 'Ward/Bed',
      render: (row) => (
        <span className="nurse-notes-registry__ward-bed">
          <span className="nurse-notes-registry__ward">{row.ward_name || '—'}</span>
          <span className="nurse-notes-registry__bed">{row.bed_number || '—'}</span>
        </span>
      ),
    },
    {
      header: 'Doctor',
      render: (row) => <span>{row.doctor_name || '—'}</span>,
    },
    {
      header: 'Department',
      render: (row) => (
        <span>
          {row.department_name
            || row.department
            || doctorDepartmentMap.get(Number(row.doctor_id))
            || '—'}
        </span>
      ),
    },
    {
      header: 'Test',
      render: (row) => <span>{row.test_name || '—'}</span>,
    },
    {
      header: 'Reported at',
      render: (row) => {
        const parts = formatReportedAtParts(row.uploaded_at);
        if (!parts) {
          return <span className="nurse-notes-registry__time">—</span>;
        }
        return (
          <span className="nurse-notes-registry__reported-at">
            <span className="nurse-notes-registry__reported-date">{parts.date}</span>
            <span className="nurse-notes-registry__reported-time">{parts.time}</span>
          </span>
        );
      },
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="nurse-table__actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="nurse-btn nurse-btn--secondary nurse-btn--sm"
            onClick={() => viewReport(row)}
          >
            View
          </button>
          {row.has_file ? (
            <button
              type="button"
              className="nurse-btn nurse-btn--primary nurse-btn--sm"
              onClick={(e) => downloadReport(row, e)}
              disabled={downloadMutation.isPending}
            >
              Download
            </button>
          ) : null}
        </div>
      ),
    },
  ], [viewReport, downloadReport, downloadMutation.isPending, doctorDepartmentMap]);

  const emptyMessage = hasFilters
    ? 'No lab reports match your filters.'
    : allocatedOnly && !(allocationSummary?.has_allocations)
      ? 'No beds assigned for this shift.'
      : allocatedOnly
        ? 'No lab reports for allocated patients.'
        : 'No lab reports for currently occupied beds.';

  return (
    <NurseLayout>
      <div className="nurse-page nurse-notes-registry nurse-lab-reports">
        {!canViewLabReports ? (
          <div className="nurse-alert nurse-alert--error">
            You do not have permission to view lab reports.
          </div>
        ) : (
          <>
            <div className="nurse-notes-registry__toolbar nurse-card">
              <div className="nurse-notes-registry__toolbar-left">
                <div className="nurse-notes-registry__icon" aria-hidden>
                  <FlaskConical size={22} />
                </div>
                <div>
                  <p className="nurse-notes-registry__count">
                    {isLoading && !data ? '…' : total}
                    {' '}
                    {total === 1 ? 'report' : 'reports'}
                  </p>
                  <p className="nurse-notes-registry__hint">
                    Click a row to view lab report
                  </p>
                </div>
              </div>

              <div className="nurse-med-patients__toolbar-filters nurse-lab-reports__toolbar-filters">
                <div
                  className={`nurse-notes-registry__search-wrap nurse-med-patients__search-wrap${
                    search ? ' nurse-med-patients__search-wrap--has-clear' : ''
                  }`}
                >
                  <input
                    type="text"
                    className="nurse-input nurse-notes-registry__search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, patient ID, or test…"
                    aria-label="Search lab reports"
                  />
                  {search ? (
                    <button
                      type="button"
                      className="nurse-med-patients__search-clear"
                      onClick={() => setSearch('')}
                      aria-label="Clear search"
                    >
                      <X size={14} aria-hidden />
                    </button>
                  ) : null}
                </div>

                <select
                  className="nurse-select nurse-lab-reports__ward-select"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  aria-label="Filter by ward"
                >
                  <option value="">All wards</option>
                  {WARD_OPTIONS.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>

                <DateInput
                  id="nurse-lab-reports-reported-date"
                  className="nurse-lab-reports__date-input"
                  value={reportedDate}
                  onChange={(e) => setReportedDate(e.target.value)}
                  aria-label="Filter by reported date"
                />

                {hasFilters ? (
                  <button
                    type="button"
                    className="nurse-btn nurse-btn--secondary nurse-btn--sm"
                    onClick={() => {
                      setSearch('');
                      setWard('');
                      setReportedDate('');
                    }}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            <QueryFeedback
              isLoading={isLoading && !data}
              isError={isError}
              error={error}
              onRetry={refetch}
            >
              <div
                className={`nurse-notes-registry__table${
                  isFetching ? ' nurse-notes-registry__table--fetching' : ''
                }`}
              >
                <NurseDataTable
                  columns={columns}
                  data={rows}
                  isLoading={false}
                  emptyMessage={emptyMessage}
                  onRowClick={viewReport}
                />
              </div>

              <NursePagination
                page={safePage}
                pageSize={PAGE_SIZE}
                total={total}
                itemCount={rows.length}
                onChange={setPage}
              />
            </QueryFeedback>
          </>
        )}
      </div>
    </NurseLayout>
  );
}
