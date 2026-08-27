import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useNavigate } from 'react-router-dom';
import { Activity, X } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import NursePagination from '@/features/nurse/components/NursePagination';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import { useNursePagedListGuard } from '@/features/nurse/hooks/useNursePagedListGuard';
import {
  buildNurseVitalsUrl,
  filterNursePatientRegistryItems,
  formatPatientIdDisplay,
} from '@/shared/api/mappers/nurseMapper';
import { QueryFeedback } from '@/shared/components/common';
import {
  useNurseBedPatientsQuery,
  useNurseVitalsListQuery,
} from '@/shared/hooks/queries/useNurseQuery';
import { useNursePatientScope } from '@/features/nurse/context/NursePatientScopeContext';
import NursePermissionButton from '@/features/nurse/components/NursePermissionButton';
import NursePatientAllocationTags from '@/features/nurse/components/NursePatientAllocationTags';
import { useAuth } from '@/shared/hooks/useAuth';
import { toast } from '@/shared/utils/toast';
import './NurseMedicationPatientsPage.css';

const PAGE_SIZE = 10;
const FETCH_PAGE_SIZE = 100;
const WARD_OPTIONS = ['ICU', 'Private', 'General'];

function VitalsStatusBadge({ done }) {
  if (done) {
    return <span className="nurse-badge nurse-badge--vitals">Done</span>;
  }
  return <span className="nurse-badge nurse-badge--not-done">Not done</span>;
}

function resolveVitalId(bedRow, vitalRow) {
  const fromList = vitalRow?.id ?? vitalRow?.vital_id;
  if (fromList != null) return fromList;
  const fromBed = bedRow?.last_vitals?.vital_id ?? bedRow?.last_vitals?.id;
  return fromBed ?? null;
}

function resolveRecordedAt(bedRow, vitalRow) {
  return (
    vitalRow?.recorded_at
    ?? bedRow?.last_vitals?.recorded_at
    ?? null
  );
}

export default function NurseVitalsRegistryPage() {
  const navigate = useNavigate();
  const { refreshPermissions } = useAuth();
  const { canUpdateVitals, canViewVitals, canCreateVitals } = useNursePermissionSet();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [ward, setWard] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);
  const { scopeFilters, scopeReady, allocatedOnly, allocationSummary } = useNursePatientScope();

  useEffect(() => {
    refreshPermissions?.();
  }, [refreshPermissions]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, ward, allocatedOnly]);

  const bedFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      page: 1,
      page_size: FETCH_PAGE_SIZE,
      ...scopeFilters,
    }),
    [debouncedSearch, scopeFilters],
  );

  const vitalsFilters = useMemo(
    () => ({
      page: 1,
      page_size: FETCH_PAGE_SIZE,
      ...scopeFilters,
    }),
    [scopeFilters],
  );

  const bedQuery = useNurseBedPatientsQuery(bedFilters, {
    enabled: scopeReady && canViewVitals,
  });
  const vitalsQuery = useNurseVitalsListQuery(vitalsFilters, {
    enabled: scopeReady && canViewVitals,
  });

  const vitalsByPatientId = useMemo(() => {
    const map = new Map();
    for (const row of vitalsQuery.data?.items ?? []) {
      const id = Number(row?.patient_id);
      if (!Number.isSafeInteger(id) || id < 1) continue;
      const existing = map.get(id);
      if (!existing) {
        map.set(id, row);
        continue;
      }
      const existingAt = existing.recorded_at ? new Date(existing.recorded_at).getTime() : 0;
      const nextAt = row.recorded_at ? new Date(row.recorded_at).getTime() : 0;
      if (nextAt >= existingAt) map.set(id, row);
    }
    return map;
  }, [vitalsQuery.data?.items]);

  const allRows = useMemo(() => {
    const bedItems = bedQuery.data?.items ?? [];
    const merged = bedItems.map((bedRow) => {
      const patientId = Number(bedRow.patient_id);
      const vitalRow = Number.isSafeInteger(patientId) ? vitalsByPatientId.get(patientId) : null;
      const hasVitals = Boolean(bedRow.has_vitals) || Boolean(vitalRow) || Boolean(bedRow.last_vitals);
      const vitalId = resolveVitalId(bedRow, vitalRow);
      const recordedAt = resolveRecordedAt(bedRow, vitalRow);
      return {
        ...bedRow,
        id: vitalId,
        vital_id: vitalId,
        has_vitals: hasVitals,
        vitals_status: hasVitals ? 'done' : 'not_done',
        recorded_at: recordedAt,
        patient_name: bedRow.patient_name || vitalRow?.patient_name || '',
        ward_name: bedRow.ward_name || vitalRow?.ward_name || '',
        bed_number: bedRow.bed_number || vitalRow?.bed_number || '',
      };
    });

    const term = String(debouncedSearch ?? '').trim();
    const searched = term ? filterNursePatientRegistryItems(merged, term) : merged;

    if (!ward) return searched;
    const wardKey = ward.toLowerCase();
    return searched.filter(
      (row) => String(row.ward_name || '').trim().toLowerCase() === wardKey,
    );
  }, [bedQuery.data?.items, vitalsByPatientId, debouncedSearch, ward]);

  const pageCount = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE) || 1);
  const safePage = Math.min(page, pageCount);
  const rows = useMemo(
    () => allRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [allRows, safePage],
  );

  const isLoading = bedQuery.isLoading || vitalsQuery.isLoading;
  const isFetching = bedQuery.isFetching || vitalsQuery.isFetching;
  const isError = bedQuery.isError || vitalsQuery.isError;
  const error = bedQuery.error ?? vitalsQuery.error;
  const dataReady = Boolean(bedQuery.data);

  const refetchBeds = bedQuery.refetch;
  const refetchVitals = vitalsQuery.refetch;
  const refetch = useCallback(() => {
    refetchBeds();
    refetchVitals();
  }, [refetchBeds, refetchVitals]);

  useNursePagedListGuard({
    isLoading,
    page: safePage,
    items: rows,
    onPageChange: setPage,
  });

  const hasFilters = Boolean(search.trim() || ward);
  const doneCount = useMemo(
    () => allRows.filter((row) => row.has_vitals).length,
    [allRows],
  );

  const viewVitals = useCallback((row) => {
    if (row.has_vitals && row.id != null) {
      navigate(`/nurse/vitals/${row.id}`);
      return;
    }
    const url = buildNurseVitalsUrl(row);
    if (url) {
      navigate(url);
      return;
    }
    toast.error('Unable to open vitals for this patient.');
  }, [navigate]);

  const updateVitals = useCallback((row) => {
    if (row.id == null) {
      toast.error('No vitals record found to update.');
      return;
    }
    navigate(`/nurse/vitals/${row.id}/edit`);
  }, [navigate]);

  const recordVitals = useCallback((row) => {
    const url = buildNurseVitalsUrl(row);
    if (!url) {
      toast.error('Unable to record vitals for this patient.');
      return;
    }
    navigate(url);
  }, [navigate]);

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
      header: 'Status',
      render: (row) => <VitalsStatusBadge done={Boolean(row.has_vitals)} />,
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
        <div className="nurse-table__actions" onClick={(e) => e.stopPropagation()}>
          {row.has_vitals ? (
            <NursePermissionButton
              allowed={canUpdateVitals}
              className="nurse-btn nurse-btn--primary nurse-btn--sm"
              onClick={() => updateVitals(row)}
            >
              Update
            </NursePermissionButton>
          ) : (
            <NursePermissionButton
              allowed={canCreateVitals}
              className="nurse-btn nurse-btn--primary nurse-btn--sm"
              onClick={() => recordVitals(row)}
            >
              Record
            </NursePermissionButton>
          )}
        </div>
      ),
    },
  ], [updateVitals, recordVitals, canUpdateVitals, canCreateVitals]);

  const emptyMessage = allocatedOnly && !(allocationSummary?.has_allocations)
    ? 'No beds assigned for this shift.'
    : hasFilters
      ? 'No patients match your filters.'
      : allocatedOnly
        ? 'No occupied patients on your assigned beds.'
        : 'No admitted patients with an assigned bed.';

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
                    {isLoading && !dataReady ? '…' : (
                      <>
                        {allRows.length}
                      </>
                    )}
                    {' '}
                    {allRows.length === 1 ? 'patient' : 'patients'}
                    {!isLoading && dataReady && allRows.length > 0 ? (
                      <>
                        {' · '}
                        <span>{doneCount} done</span>
                        {' · '}
                        <span>{allRows.length - doneCount} not done</span>
                      </>
                    ) : null}
                  </p>
                  <p className="nurse-vitals-registry__hint">
                    All admitted patients. Status shows whether vitals are recorded.
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
              isLoading={(!scopeReady || isLoading) && !dataReady}
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
                  emptyMessage={emptyMessage}
                  onRowClick={viewVitals}
                />
              </div>

              <NursePagination
                page={safePage}
                pageSize={PAGE_SIZE}
                total={allRows.length}
                hasNextPage={safePage < pageCount}
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
