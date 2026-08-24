import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, X } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import NursePagination from '@/features/nurse/components/NursePagination';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import { useNursePagedListGuard } from '@/features/nurse/hooks/useNursePagedListGuard';
import { getPagedListCount, formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
import { QueryFeedback } from '@/shared/components/common';
import {
  useNurseLabReportsQuery,
  useDownloadNurseLabReportFileMutation,
} from '@/shared/hooks/queries/useNurseQuery';
import { useNursePatientScope } from '@/features/nurse/context/NursePatientScopeContext';
import NursePatientAllocationTags from '@/features/nurse/components/NursePatientAllocationTags';
import { useAuth } from '@/shared/hooks/useAuth';
import { toast } from '@/shared/utils/toast';
import { ROUTES } from '@/shared/constants';

function formatReportedAt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
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
  const debouncedSearch = useDebouncedValue(search, 400);
  const {
    scopeFilters,
    scopeReady,
    allocatedOnly,
    allocationSummary,
  } = useNursePatientScope();
  const downloadMutation = useDownloadNurseLabReportFileMutation();

  useEffect(() => {
    refreshPermissions?.();
  }, [refreshPermissions]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, allocatedOnly]);

  const { data, isLoading, isFetching, isError, error, refetch } = useNurseLabReportsQuery(
    { search: debouncedSearch, page, page_size: 20, ...scopeFilters },
    { enabled: scopeReady && canViewLabReports },
  );

  useNursePagedListGuard({
    isLoading,
    page,
    items: data?.items,
    onPageChange: setPage,
  });

  const listCount = useMemo(
    () => getPagedListCount({
      page,
      page_size: 20,
      items: data?.items,
      total: data?.total,
      hasNextPage: data?.hasNextPage,
    }),
    [data, page],
  );

  const viewReport = useCallback((row) => {
    const id = row.report_id ?? row.id;
    if (id == null) return;
    navigate(ROUTES.NURSE_LAB_REPORT_DETAIL.replace(':reportId', String(id)));
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
      header: 'Ward',
      render: (row) => <span>{row.ward_name || '—'}</span>,
    },
    {
      header: 'Bed',
      render: (row) => (
        <span className="nurse-notes-registry__bed">{row.bed_number || '—'}</span>
      ),
    },
    {
      header: 'Doctor',
      render: (row) => <span>{row.doctor_name || '—'}</span>,
    },
    {
      header: 'Test',
      render: (row) => <span>{row.test_name || '—'}</span>,
    },
    {
      header: 'Reported at',
      render: (row) => (
        <span className="nurse-notes-registry__time">{formatReportedAt(row.uploaded_at)}</span>
      ),
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
  ], [viewReport, downloadReport, downloadMutation.isPending]);

  const emptyMessage =
    allocatedOnly && !(allocationSummary?.has_allocations)
      ? 'No beds assigned for this shift.'
      : allocatedOnly
        ? 'No lab reports for allocated patients.'
        : 'No lab reports for currently occupied beds.';

  return (
    <NurseLayout>
      <div className="nurse-page nurse-notes-registry">
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
                    {isLoading && !data ? '…' : (
                      <>
                        {listCount.approximate ? `${listCount.count}+` : listCount.count}
                      </>
                    )}
                    {' '}
                    {listCount.count === 1 && !listCount.approximate ? 'report' : 'reports'}
                  </p>
                  <p className="nurse-notes-registry__hint">
                    Completed lab reports for patients on occupied beds. View and download only.
                  </p>
                </div>
              </div>
              <div
                className={`nurse-notes-registry__search-wrap nurse-lab-reports__search-wrap${search ? ' nurse-lab-reports__search-wrap--has-clear' : ''}`}
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
                    className="nurse-lab-reports__search-clear"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                  >
                    <X size={14} aria-hidden />
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
              <div className={`nurse-notes-registry__table${isFetching ? ' nurse-notes-registry__table--fetching' : ''}`}>
                <NurseDataTable
                  columns={columns}
                  data={data?.items || []}
                  isLoading={false}
                  emptyMessage={emptyMessage}
                  onRowClick={viewReport}
                />
              </div>

              <NursePagination
                page={page}
                pageSize={20}
                total={data?.total}
                hasNextPage={data?.hasNextPage}
                itemCount={data?.items?.length ?? 0}
                onChange={setPage}
              />
            </QueryFeedback>
          </>
        )}
      </div>
    </NurseLayout>
  );
}
