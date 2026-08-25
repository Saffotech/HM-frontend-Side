import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import NursePagination from '@/features/nurse/components/NursePagination';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import { useNursePagedListGuard } from '@/features/nurse/hooks/useNursePagedListGuard';
import { getPagedListCount, formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
import { QueryFeedback } from '@/shared/components/common';
import { useNurseVitalsListQuery } from '@/shared/hooks/queries/useNurseQuery';
import { useNursePatientScope } from '@/features/nurse/context/NursePatientScopeContext';
import NursePermissionButton from '@/features/nurse/components/NursePermissionButton';
import NursePatientAllocationTags from '@/features/nurse/components/NursePatientAllocationTags';
import { useAuth } from '@/shared/hooks/useAuth';

export default function NurseVitalsRegistryPage() {
  const navigate = useNavigate();
  const { refreshPermissions } = useAuth();
  const { canUpdateVitals, canViewVitals } = useNursePermissionSet();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);
  const { scopeFilters, scopeReady, allocatedOnly } = useNursePatientScope();

  useEffect(() => {
    refreshPermissions?.();
  }, [refreshPermissions]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, allocatedOnly]);

  const { data, isLoading, isFetching, isError, error, refetch } = useNurseVitalsListQuery(
    { search: debouncedSearch, page, page_size: 20, ...scopeFilters },
    { enabled: scopeReady && canViewVitals },
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
        <span className="nurse-patient-name-with-tags">
          <span className="nurse-vitals-registry__name">{row.patient_name || '—'}</span>
          <NursePatientAllocationTags patientId={row.patient_id} />
        </span>
      ),
    },
    {
      header: 'Ward',
      render: (row) => <span>{row.ward_name || '—'}</span>,
    },
    {
      header: 'Bed Number',
      render: (row) => <span className="nurse-vitals-registry__bed">{row.bed_number || '—'}</span>,
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
          <NursePermissionButton
            allowed={canUpdateVitals}
            className="nurse-btn nurse-btn--primary nurse-btn--sm"
            onClick={() => updateVitals(row)}
          >
            Update
          </NursePermissionButton>
        </div>
      ),
    },
  ], [updateVitals, canUpdateVitals]);

  return (
    <NurseLayout>
      <div className="nurse-page nurse-vitals-registry">
        {!canViewVitals ? (
          <div className="nurse-alert nurse-alert--error">You do not have permission to view vitals.</div>
        ) : (
          <>
        <div className="nurse-vitals-registry__toolbar nurse-card">
          <div className="nurse-vitals-registry__toolbar-left">
            <div className="nurse-vitals-registry__icon" aria-hidden>
              <Activity size={22} />
            </div>
            <div>
              <p className="nurse-vitals-registry__count">
                {isLoading && !data ? '…' : (
                  <>
                    {listCount.approximate ? `${listCount.count}+` : listCount.count}
                  </>
                )}
                {' '}
                {listCount.count === 1 && !listCount.approximate ? 'patient' : 'patients'}
              </p>
              <p className="nurse-vitals-registry__hint">
                One row per patient (latest vitals). Open a row for full history.
              </p>
            </div>
          </div>
          <div className="nurse-vitals-registry__search-wrap">
            <input
              type="text"
              className="nurse-input nurse-vitals-registry__search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, patient ID, or bed number…"
            />
          </div>
        </div>

        <QueryFeedback
          isLoading={isLoading && !data}
          isError={isError}
          error={error}
          onRetry={refetch}
        >
        <div className={`nurse-vitals-registry__table${isFetching ? ' nurse-vitals-registry__table--fetching' : ''}`}>
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
          </>
        )}
      </div>
    </NurseLayout>
  );
}
