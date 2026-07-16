import { useState, useMemo, useCallback } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Users } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import NursePagination from '@/features/nurse/components/NursePagination';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import { useNurseDocumentedPatients } from '@/features/nurse/hooks/useNurseDocumentedPatients';
import { QueryFeedback } from '@/shared/components/common';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';

export default function NurseQueuePage() {
  const navigate = useNavigate();
  const { canViewPatients } = useNursePermissionSet();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 400);

  const { data, isLoading, isError, error, refetch, isFetching } = useNurseDocumentedPatients({
    search: debouncedSearch,
    page,
    page_size: 20,
  });

  const total = data?.total || 0;

  const handleRowClick = useCallback(
    (row) => {
      if (canViewPatients) {
        navigate(`/nurse/patients/${row.patient_id}`);
      }
    },
    [navigate, canViewPatients],
  );

  const columns = useMemo(() => [
    {
      header: 'Patient ID',
      render: (row) => <span className="nurse-queue__id">{formatPatientIdDisplay(row)}</span>,
    },
    {
      header: 'Patient Name',
      render: (row) => <span className="nurse-queue__name">{row.patient_name}</span>,
    },
    {
      header: 'Bed Number',
      render: (row) => <span className="nurse-queue__bed">{row.bed_number || '—'}</span>,
    },
    {
      header: 'Ward',
      render: (row) => <span className="nurse-queue__phone">{row.ward_name || '—'}</span>,
    },
    {
      header: 'Phone',
      render: (row) => <span className="nurse-queue__phone">{row.phone || '—'}</span>,
    },
    {
      header: 'Vitals',
      render: () => <span className="nurse-badge nurse-badge--vitals">Done</span>,
    },
    {
      header: 'Notes',
      render: () => <span className="nurse-badge nurse-badge--notes">Done</span>,
    },
  ], []);

  const hasActiveFilters = Boolean(search);

  const clearFilters = () => {
    setSearch('');
    setPage(1);
  };

  return (
    <NurseLayout>
      <div className="nurse-page nurse-queue-page">
        <div className="nurse-queue-page__header nurse-card">
          <div className="nurse-queue-page__header-left">
            <div className="nurse-queue-page__icon" aria-hidden>
              <Users size={20} />
            </div>
            <div>
              <h1 className="nurse-queue-page__title">Patient</h1>
              <p className="nurse-queue-page__subtitle">
                {isLoading ? 'Loading patients…' : (
                  <>
                    <strong>{total}</strong>
                    {' '}
                    {total === 1 ? 'patient' : 'patients'}
                    {' '}
                    with vitals and notes completed
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="nurse-btn nurse-btn--secondary nurse-queue-page__refresh"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={15} className={isFetching ? 'nurse-queue-page__spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="nurse-card nurse-queue-page__toolbar">
          <label htmlFor="nurse-queue-search" className="nurse-queue-page__search-label">
            Search patients
          </label>
          <div className="nurse-queue-page__toolbar-row">
            <div className="nurse-queue-page__search-wrap">
              <input
                id="nurse-queue-search"
                type="search"
                className="nurse-input nurse-queue-page__search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Name, UHID, bed, or ward…"
                aria-label="Search documented patients"
              />
            </div>
            {hasActiveFilters && (
              <button type="button" className="nurse-queue-page__clear" onClick={clearFilters}>
                Clear
              </button>
            )}
          </div>
        </div>

        <QueryFeedback
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={refetch}
        >
          <div className="nurse-queue-page__table">
            <NurseDataTable
              columns={columns}
              data={data?.items || []}
              isLoading={false}
              emptyMessage="No patients with both vitals and nursing notes recorded yet. Complete care on the dashboard first."
              onRowClick={canViewPatients ? handleRowClick : undefined}
            />
          </div>

          <NursePagination
            page={page}
            pageSize={20}
            total={data?.total}
            itemCount={data?.items?.length ?? 0}
            onChange={setPage}
          />
        </QueryFeedback>
      </div>
    </NurseLayout>
  );
}
