import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useNavigate } from 'react-router-dom';
import { Activity, X } from 'lucide-react';
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
import './NurseMedicationPatientsPage.css';

const PAGE_SIZE = 20;
const FETCH_PAGE_SIZE = 100;
const WARD_OPTIONS = ['ICU', 'Private', 'General'];

export default function NurseVitalsRegistryPage() {
  const navigate = useNavigate();
  const { refreshPermissions } = useAuth();
  const { canUpdateVitals, canViewVitals } = useNursePermissionSet();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [ward, setWard] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);
  const { scopeFilters, scopeReady, allocatedOnly } = useNursePatientScope();

  useEffect(() => {
    refreshPermissions?.();
  }, [refreshPermissions]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, ward, allocatedOnly]);

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      page: ward ? 1 : page,
      page_size: ward ? FETCH_PAGE_SIZE : PAGE_SIZE,
      ...scopeFilters,
    }),
    [debouncedSearch, ward, page, scopeFilters],
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useNurseVitalsListQuery(
    filters,
    { enabled: scopeReady && canViewVitals },
  );

  const allRows = useMemo(() => {
    const items = data?.items ?? [];
    if (!ward) return items;
    const wardKey = ward.toLowerCase();
    return items.filter(
      (row) => String(row.ward_name || '').trim().toLowerCase() === wardKey,
    );
  }, [data?.items, ward]);

  const wardPageCount = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE) || 1);
  const safePage = ward ? Math.min(page, wardPageCount) : page;
  const rows = useMemo(() => {
    if (!ward) return allRows;
    return allRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  }, [allRows, ward, safePage]);

  useNursePagedListGuard({
    isLoading,
    page: ward ? safePage : page,
    items: ward ? rows : data?.items,
    onPageChange: setPage,
  });

  const listCount = useMemo(() => {
    if (ward) {
      return { count: allRows.length, approximate: false };
    }
    return getPagedListCount({
      page,
      page_size: PAGE_SIZE,
      items: data?.items,
      total: data?.total,
      hasNextPage: data?.hasNextPage,
    });
  }, [ward, allRows.length, page, data]);

  const hasFilters = Boolean(search.trim() || ward);

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

              <div className="nurse-med-patients__toolbar-filters">
                <div
                  className={`nurse-vitals-registry__search-wrap nurse-med-patients__search-wrap${
                    search ? ' nurse-med-patients__search-wrap--has-clear' : ''
                  }`}
                >
                  <input
                    type="text"
                    className="nurse-input nurse-vitals-registry__search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, patient ID, or bed number…"
                    aria-label="Search vitals"
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
                  className="nurse-select nurse-vitals-registry__ward-select"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  aria-label="Filter by ward"
                >
                  <option value="">All wards</option>
                  {WARD_OPTIONS.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>

                {hasFilters ? (
                  <button
                    type="button"
                    className="nurse-btn nurse-btn--secondary nurse-btn--sm"
                    onClick={() => {
                      setSearch('');
                      setWard('');
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
                className={`nurse-vitals-registry__table${
                  isFetching ? ' nurse-vitals-registry__table--fetching' : ''
                }`}
              >
                <NurseDataTable
                  columns={columns}
                  data={rows}
                  isLoading={false}
                  emptyMessage={
                    hasFilters ? 'No vitals match your filters.' : 'No vitals recorded yet.'
                  }
                  onRowClick={viewVitals}
                />
              </div>

              <NursePagination
                page={ward ? safePage : page}
                pageSize={PAGE_SIZE}
                total={ward ? allRows.length : data?.total}
                hasNextPage={ward ? safePage < wardPageCount : data?.hasNextPage}
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
