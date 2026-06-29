import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useNavigate } from 'react-router-dom';
import { Activity, Search } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import NursePagination from '@/features/nurse/components/NursePagination';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import { useNursePagedListGuard } from '@/features/nurse/hooks/useNursePagedListGuard';
import { getPagedListCount, formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
import { QueryFeedback } from '@/shared/components/common';
import { useNurseVitalsListQuery } from '@/shared/hooks/queries/useNurseQuery';

function formatSince(iso) {
  if (!iso) return '—';
  const then = new Date(iso);
  const now = new Date();
  const diffMs = now - then;
  if (diffMs < 0) return 'Just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return then.toLocaleDateString();
}

function sinceTone(iso) {
  if (!iso) return 'muted';
  const diffMs = Date.now() - new Date(iso);
  if (diffMs < 0) return 'fresh';
  const hours = diffMs / 3600000;
  if (hours < 2) return 'fresh';
  if (hours < 6) return 'warn';
  return 'stale';
}

export default function NurseVitalsRegistryPage() {
  const navigate = useNavigate();
  const { canUpdateVitals } = useNursePermissionSet();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, isError, error, refetch } = useNurseVitalsListQuery({ search: debouncedSearch, page, page_size: 20 });

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

  const viewVitals = useCallback((row) => navigate(`/nurse/vitals/${row.id}`), [navigate]);
  const updateVitals = useCallback((row) => navigate(`/nurse/vitals/${row.id}/edit`), [navigate]);

  const columns = useMemo(() => [
    {
      header: 'Patient ID',
      render: (row) => <span className="nurse-vitals-registry__id">{formatPatientIdDisplay(row)}</span>,
    },
    {
      header: 'Patient Name',
      render: (row) => (
        <span className="nurse-vitals-registry__name">{row.patient_name || '—'}</span>
      ),
    },
    {
      header: 'Bed Number',
      render: (row) => <span className="nurse-vitals-registry__bed">{row.bed_number || '—'}</span>,
    },
    {
      header: 'Since',
      render: (row) => (
        <span className={`nurse-since-badge nurse-since-badge--${sinceTone(row.recorded_at)}`}>
          {formatSince(row.recorded_at)}
        </span>
      ),
    },
    {
      header: 'Recorded At',
      render: (row) => (
        <span className="nurse-vitals-registry__time">
          {row.recorded_at ? new Date(row.recorded_at).toLocaleString() : '—'}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="nurse-table__actions">
          {canUpdateVitals ? (
            <button
              type="button"
              className="nurse-btn nurse-btn--primary nurse-btn--sm"
              onClick={(e) => {
                e.stopPropagation();
                updateVitals(row);
              }}
            >
              Update
            </button>
          ) : null}
        </div>
      ),
    },
  ], [updateVitals, canUpdateVitals]);

  return (
    <NurseLayout>
      <div className="nurse-page nurse-vitals-registry">
        <div className="nurse-vitals-registry__toolbar nurse-card">
          <div className="nurse-vitals-registry__toolbar-left">
            <div className="nurse-vitals-registry__icon" aria-hidden>
              <Activity size={22} />
            </div>
            <div>
              <p className="nurse-vitals-registry__count">
                {isLoading ? '…' : (
                  <>
                    {listCount.approximate ? `${listCount.count}+` : listCount.count}
                  </>
                )}
                {' '}
                {listCount.count === 1 && !listCount.approximate ? 'patient' : 'patients'}
              </p>
              <p className="nurse-vitals-registry__hint">Click a row to view full vitals history</p>
            </div>
          </div>
          <div className="nurse-vitals-registry__search-wrap">
            <Search size={18} className="nurse-vitals-registry__search-icon" aria-hidden />
            <input
              type="text"
              className="nurse-input nurse-vitals-registry__search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, patient ID, or phone…"
            />
          </div>
        </div>

        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
        <div className="nurse-vitals-registry__table">
          <NurseDataTable
            columns={columns}
            data={data?.items || []}
            isLoading={false}
            emptyMessage="No vitals recorded yet."
            onRowClick={viewVitals}
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
      </div>
    </NurseLayout>
  );
}
