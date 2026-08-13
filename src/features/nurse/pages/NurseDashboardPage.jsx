import { useCallback, useMemo, useState } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useNavigate } from 'react-router-dom';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import { useNursePatientScope } from '@/features/nurse/context/NursePatientScopeContext';
import { QueryFeedback } from '@/shared/components/common';
import {
  buildNurseNotesUrl,
  buildNurseVitalsUrl,
  formatPatientIdDisplay,
} from '@/shared/api/mappers/nurseMapper';
import { useNurseBedPatientsQuery } from '@/shared/hooks/queries/useNurseQuery';
import NursePermissionButton from '@/features/nurse/components/NursePermissionButton';

const KPI_FILTERS = {
  all: (row) => true,
  pending_meds: (row) => (row.pending_medications ?? 0) > 0,
  needs_vitals: (row) => !row.has_vitals,
  has_vitals: (row) => row.has_vitals,
};

const KPI_TABLE_TITLES = {
  all: 'Admitted Patients',
  pending_meds: 'Pending Medications',
  needs_vitals: 'Needs Vitals',
  has_vitals: 'Vitals Recorded',
};

function computeKpiCounts(items = []) {
  return {
    all: items.length,
    pending_meds: items.filter(KPI_FILTERS.pending_meds).length,
    needs_vitals: items.filter(KPI_FILTERS.needs_vitals).length,
    has_vitals: items.filter(KPI_FILTERS.has_vitals).length,
  };
}

export default function NurseDashboardPage() {
  const navigate = useNavigate();
  const { canViewPatients, canCreateVitals, canCreateNotes } = useNursePermissionSet();
  const [activeKpi, setActiveKpi] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 400);

  const {
    listMode,
    allocatedOnly,
    scopeReady,
    scopeFilters,
    allocationSummary,
    allocatedBedIdSet,
  } = useNursePatientScope();

  const bedFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      page: 1,
      page_size: 100,
      ...scopeFilters,
    }),
    [debouncedSearch, scopeFilters],
  );

  const {
    data: bedPatients,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useNurseBedPatientsQuery(bedFilters, {
    enabled: scopeReady,
  });

  const patientsWithBadges = useMemo(() => {
    return (bedPatients?.items ?? []).map((row) => ({
      ...row,
      is_allocated: allocatedBedIdSet.has(Number(row.bed_id)),
    }));
  }, [bedPatients?.items, allocatedBedIdSet]);

  const kpiCounts = useMemo(
    () => computeKpiCounts(patientsWithBadges),
    [patientsWithBadges],
  );

  const filteredPatients = useMemo(() => {
    const filterFn = KPI_FILTERS[activeKpi] ?? KPI_FILTERS.all;
    return patientsWithBadges.filter(filterFn);
  }, [patientsWithBadges, activeKpi]);

  const kpis = [
    { id: 'all', label: 'Admitted', value: bedPatients?.total ?? kpiCounts.all, border: '' },
    { id: 'pending_meds', label: 'Pending Meds', value: kpiCounts.pending_meds, border: 'nurse-kpi--purple' },
    { id: 'needs_vitals', label: 'Needs Vitals', value: kpiCounts.needs_vitals, border: 'nurse-kpi--yellow' },
    { id: 'has_vitals', label: 'Vitals Recorded', value: kpiCounts.has_vitals, border: 'nurse-kpi--green' },
  ];

  const handleRowClick = useCallback(
    (row) => {
      if (canViewPatients) {
        navigate(`/nurse/patients/${row.patient_id}`);
      }
    },
    [navigate, canViewPatients],
  );

  const columns = useMemo(() => [
    { header: 'Patient ID', render: (row) => formatPatientIdDisplay(row) },
    {
      header: 'Patient Name',
      render: (row) => (
        <span className="nurse-dashboard-page__patient-cell">
          <span>{row.patient_name}</span>
          {listMode === 'allocated' && (
            <span className="nurse-badge nurse-badge--allocated">Allocated</span>
          )}
          {listMode === 'all' && row.is_allocated && (
            <span className="nurse-badge nurse-badge--allocated">Allocated</span>
          )}
          {listMode === 'all' && !row.is_allocated && allocatedBedIdSet.size > 0 && (
            <span className="nurse-badge nurse-badge--outside-allocation">Outside Allocation</span>
          )}
        </span>
      ),
    },
    { header: 'Bed', accessor: 'bed_number' },
    { header: 'Ward', accessor: 'ward_name' },
    { header: 'Department', render: (row) => row.department || '—' },
    {
      header: 'Pending Meds',
      render: (row) => (row.pending_medications > 0 ? row.pending_medications : '—'),
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="nurse-table__actions nurse-dashboard-page__actions">
          <NursePermissionButton
            allowed={canCreateVitals}
            className="nurse-dashboard-page__action-btn nurse-dashboard-page__action-btn--vitals"
            onClick={() => {
              const url = buildNurseVitalsUrl(row);
              if (url) navigate(url);
            }}
          >
            Vitals
          </NursePermissionButton>
          <NursePermissionButton
            allowed={canCreateNotes}
            className="nurse-dashboard-page__action-btn nurse-dashboard-page__action-btn--note"
            onClick={() => {
              const url = buildNurseNotesUrl(row);
              if (url) navigate(url);
            }}
          >
            Note
          </NursePermissionButton>
        </div>
      ),
    },
  ], [navigate, canCreateVitals, canCreateNotes, listMode, allocatedBedIdSet.size]);

  const emptyMessage =
    allocatedOnly && !(allocationSummary?.has_allocations)
      ? 'No beds assigned for this shift.'
      : allocatedOnly
        ? 'No occupied patients on your assigned beds match the filters.'
        : 'No admitted patients with an assigned bed match the filters.';

  const initialLoading = !scopeReady || (isLoading && !bedPatients);

  return (
    <NurseLayout>
      <div className="nurse-page nurse-dashboard-page">
        <div className="nurse-kpi-grid" role="tablist" aria-label="Admitted patient filters">
          {kpis.map((kpi) => (
            <button
              key={kpi.id}
              type="button"
              role="tab"
              aria-selected={activeKpi === kpi.id}
              className={`nurse-card nurse-kpi ${kpi.border} ${activeKpi === kpi.id ? 'nurse-kpi--active' : ''}`}
              onClick={() => setActiveKpi(kpi.id)}
            >
              <p className="nurse-kpi__label">{kpi.label}</p>
              <p className="nurse-kpi__value">
                {initialLoading ? '—' : kpi.value}
              </p>
            </button>
          ))}
        </div>

        <div className="nurse-dashboard-table__header">
          <h2 className="nurse-section-title">{KPI_TABLE_TITLES[activeKpi]}</h2>
          <div className="nurse-field nurse-dashboard-table__search">
            <label htmlFor="nurse-dashboard-search">Search patients</label>
            <div className="nurse-dashboard-page__search-wrap">
              <input
                id="nurse-dashboard-search"
                type="search"
                className="nurse-input nurse-dashboard-page__search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, UHID, bed, or ward…"
                aria-label="Search admitted patients"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        <QueryFeedback
          isLoading={initialLoading}
          isError={isError}
          error={error}
          onRetry={refetch}
        >
          <div
            className="nurse-dashboard-page__table"
            aria-busy={isFetching && !initialLoading}
          >
            <NurseDataTable
              columns={columns}
              data={filteredPatients}
              isLoading={false}
              emptyMessage={emptyMessage}
              onRowClick={canViewPatients ? handleRowClick : undefined}
            />
          </div>
        </QueryFeedback>
      </div>
    </NurseLayout>
  );
}
