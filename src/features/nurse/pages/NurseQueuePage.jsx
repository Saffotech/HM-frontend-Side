import { useState, useMemo, useCallback, useEffect } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Users } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import NursePagination from '@/features/nurse/components/NursePagination';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import { useNurseDocumentedPatients } from '@/features/nurse/hooks/useNurseDocumentedPatients';
import { useNursePatientScope } from '@/features/nurse/context/NursePatientScopeContext';
import { QueryFeedback } from '@/shared/components/common';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
import NursePatientAllocationTags from '@/features/nurse/components/NursePatientAllocationTags';

function CareStatusBadge({ done, doneLabel = 'Done', pendingLabel = 'Not done', tone }) {
  if (done) {
    return (
      <span className={`nurse-badge nurse-badge--${tone}`}>
        {doneLabel}
      </span>
    );
  }
  return (
    <span className="nurse-badge nurse-badge--not-done">
      {pendingLabel}
    </span>
  );
}

export default function NurseQueuePage() {
  const navigate = useNavigate();
  const { canViewPatients } = useNursePermissionSet();
  const { scopeReady, allocatedOnly, allocationSummary } = useNursePatientScope();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 400);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, allocatedOnly]);

  const { data, isLoading, isError, error, refetch, isFetching } = useNurseDocumentedPatients({
    search: debouncedSearch,
    page,
    page_size: 20,
  });

  const total = data?.total || 0;
  const pendingCareCount = data?.pending_care_count || 0;

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
      render: (row) => (
        <span className="nurse-patient-name-with-tags">
          <span className="nurse-queue__name">{row.patient_name}</span>
          <NursePatientAllocationTags patientId={row.patient_id} />
        </span>
      ),
    },
    {
      header: 'Bed Number',
      render: (row) => <span className="nurse-queue__bed">{row.bed_number || '—'}</span>,
    },
    {
      header: 'Ward',
      render: (row) => <span className="nurse-queue__ward">{row.ward_name || '—'}</span>,
    },
    {
      header: 'Vitals',
      render: (row) => <CareStatusBadge done={Boolean(row.has_vitals)} tone="vitals" />,
    },
    {
      header: 'Notes',
      render: (row) => <CareStatusBadge done={Boolean(row.has_notes)} tone="notes" />,
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
                {!scopeReady || isLoading ? 'Loading patients…' : (
                  <>
                    <strong>{total}</strong>
                    {' '}
                    {total === 1 ? 'patient' : 'patients'}
                    {pendingCareCount > 0 ? (
                      <>
                        {' · '}
                        <strong>{pendingCareCount}</strong>
                        {' '}
                        need vitals or notes
                      </>
                    ) : null}
                    {allocatedOnly && allocationSummary?.has_allocations === false
                      ? ' (no beds assigned this shift)'
                      : ''}
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
                aria-label="Search patients"
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
              emptyMessage="No patients found."
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
