import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseSkeletonCard from '@/features/nurse/components/NurseSkeletonCard';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import NursePriorityBadge from '@/features/nurse/components/NursePriorityBadge';
import NurseQueueStatusBadge from '@/features/nurse/components/NurseQueueStatusBadge';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import { QueryFeedback } from '@/shared/components/common';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
import { useNurseQueueQuery, useNurseQueueKpiCounts } from '@/shared/hooks/queries/useNurseQuery';

const KPI_FILTERS = {
  all: {},
  waiting: { status: 'waiting' },
  vitals_completed: { status: 'vitals_completed' },
  in_consultation: { status: 'in_consultation' },
  emergency: { priority: 'emergency' },
};

const KPI_TABLE_TITLES = {
  all: 'All Patients in Queue',
  waiting: 'Waiting Vitals',
  vitals_completed: 'Vitals Completed',
  in_consultation: 'In Consultation',
  emergency: 'Emergency Cases',
};

export default function NurseDashboardPage() {
  const navigate = useNavigate();
  const { canViewPatients, canCreateVitals, canCreateNotes } = useNursePermissionSet();
  const [activeKpi, setActiveKpi] = useState('all');
  const [search, setSearch] = useState('');
  const [allCountSnapshot, setAllCountSnapshot] = useState(0);
  const debouncedSearch = useDebouncedValue(search.trim(), 400);

  const {
    counts: kpiCounts,
    isLoading: isLoadingKpis,
    isError: isKpiError,
    error: kpiError,
    refetch: refetchKpis,
  } = useNurseQueueKpiCounts();
  const {
    data: filteredQueue,
    isLoading: isLoadingFiltered,
    isError: isQueueError,
    error: queueError,
    refetch: refetchQueue,
  } = useNurseQueueQuery({
    ...KPI_FILTERS[activeKpi],
    search: debouncedSearch || undefined,
    page: 1,
    page_size: 20,
  });

  const kpis = [
    { id: 'all', label: 'Total Queue', value: activeKpi === 'all' && !debouncedSearch ? (filteredQueue?.total ?? allCountSnapshot) : allCountSnapshot, border: '', loading: false },
    { id: 'waiting', label: 'Waiting Vitals', value: kpiCounts.waiting, border: 'nurse-kpi--yellow', loading: isLoadingKpis },
    { id: 'vitals_completed', label: 'Vitals Completed', value: kpiCounts.vitals_completed, border: 'nurse-kpi--green', loading: isLoadingKpis },
    { id: 'in_consultation', label: 'In Consultation', value: kpiCounts.in_consultation, border: 'nurse-kpi--purple', loading: isLoadingKpis },
    { id: 'emergency', label: 'Emergency Cases', value: kpiCounts.emergency, border: 'nurse-kpi--red', loading: isLoadingKpis },
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
    { header: 'Patient Name', accessor: 'patient_name' },
    { header: 'BED Number', accessor: 'bed_number' },
    { header: 'Priority', render: (row) => <NursePriorityBadge priority={row.priority} /> },
    { header: 'Status', render: (row) => <NurseQueueStatusBadge status={row.status} /> },
    {
      header: 'Actions',
      render: (row) => (
        <div className="nurse-table__actions nurse-dashboard-page__actions">
          {canCreateVitals && (
            <button
              type="button"
              className="nurse-dashboard-page__action-btn nurse-dashboard-page__action-btn--vitals"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/nurse/vitals/new?appointmentId=${row.id}`);
              }}
            >
              Vitals
            </button>
          )}
          {canCreateNotes && (
            <button
              type="button"
              className="nurse-dashboard-page__action-btn nurse-dashboard-page__action-btn--note"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/nurse/notes/new?appointmentId=${row.id}`);
              }}
            >
              Note
            </button>
          )}
        </div>
      ),
    },
  ], [navigate, canCreateVitals, canCreateNotes]);

  useEffect(() => {
    if (activeKpi === 'all' && !debouncedSearch && filteredQueue?.total != null) {
      setAllCountSnapshot(filteredQueue.total);
    }
  }, [activeKpi, debouncedSearch, filteredQueue?.total]);

  return (
    <NurseLayout>
      <div className="nurse-page nurse-dashboard-page">
        <div className="nurse-kpi-grid" role="tablist" aria-label="Queue filters">
          {isKpiError ? (
            <QueryFeedback
              isLoading={false}
              isError
              error={kpiError}
              onRetry={refetchKpis}
            />
          ) : (
            kpis.map((kpi) =>
              kpi.loading ? (
                <NurseSkeletonCard key={kpi.id} />
              ) : (
                <button
                  key={kpi.id}
                  type="button"
                  role="tab"
                  aria-selected={activeKpi === kpi.id}
                  className={`nurse-card nurse-kpi ${kpi.border} ${activeKpi === kpi.id ? 'nurse-kpi--active' : ''}`}
                  onClick={() => setActiveKpi(kpi.id)}
                >
                  <p className="nurse-kpi__label">{kpi.label}</p>
                  <p className="nurse-kpi__value">{kpi.value}</p>
                </button>
              )
            )
          )}
        </div>
        <QueryFeedback
          isLoading={isLoadingFiltered}
          isError={isQueueError}
          error={queueError}
          onRetry={refetchQueue}
        >
          <div className="nurse-dashboard-table__header">
            <h2 className="nurse-section-title">{KPI_TABLE_TITLES[activeKpi]}</h2>
            <div className="nurse-field nurse-dashboard-table__search">
              <label htmlFor="nurse-dashboard-search">Search patients</label>
              <div className="nurse-dashboard-page__search-wrap">
                <Search size={16} className="nurse-dashboard-page__search-icon" aria-hidden />
                <input
                  id="nurse-dashboard-search"
                  type="search"
                  className="nurse-input nurse-dashboard-page__search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, phone, patient ID, or token…"
                  aria-label="Search patients in queue"
                />
              </div>
            </div>
          </div>
          <div className="nurse-dashboard-page__table">
            <NurseDataTable
              columns={columns}
              data={filteredQueue?.items || []}
              isLoading={false}
              emptyMessage={`No patients in ${KPI_TABLE_TITLES[activeKpi].toLowerCase()}.`}
              onRowClick={canViewPatients ? handleRowClick : undefined}
            />
          </div>
        </QueryFeedback>
      </div>
    </NurseLayout>
  );
}
