import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Plus, Search } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseDataTable from '@/features/nurse/components/NurseDataTable';
import NursePagination from '@/features/nurse/components/NursePagination';
import NurseQueueStatusBadge from '@/features/nurse/components/NurseQueueStatusBadge';
import NurseSeverityBadge from '@/features/nurse/components/NurseSeverityBadge';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import { QueryFeedback, DateInput } from '@/shared/components/common';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import {
  useNurseAlertsQuery,
  useNurseAlertSummaryQuery,
  useNurseBedPatientsQuery,
} from '@/shared/hooks/queries/useNurseQuery';
import { useNursePatientScope } from '@/features/nurse/context/NursePatientScopeContext';
import { ROUTES } from '@/shared/constants';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
import NursePermissionButton from '@/features/nurse/components/NursePermissionButton';
import { useAuth } from '@/shared/hooks/useAuth';

const STATUS_TABS = [
  { id: 'active', label: 'Active' },
  { id: 'resolved', label: 'Resolved' },
];

const KPI_FILTERS = {
  active: 'active',
  critical: 'critical',
  unassigned: 'unassigned',
};

const ALERT_TYPES = [
  { value: 'manual', label: 'Manual emergency' },
  { value: 'low_bp', label: 'Low blood pressure' },
  { value: 'high_bp', label: 'High blood pressure' },
  { value: 'high_fever', label: 'High fever' },
  { value: 'cardiac', label: 'Cardiac / heart rate' },
  { value: 'low_spo2', label: 'Low SpO₂' },
  { value: 'overdue_medication', label: 'Overdue medication' },
  { value: 'other', label: 'Other' },
];

export default function NurseAlertsPage() {
  const navigate = useNavigate();
  const { refreshPermissions } = useAuth();
  const { canCreateAlerts, canViewAlerts } = useNursePermissionSet();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('active');
  const [severity, setSeverity] = useState('');
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [kpiFilter, setKpiFilter] = useState(null);
  const [alertType, setAlertType] = useState('');
  const [wardName, setWardName] = useState('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const {
    scopeReady,
    allocatedOnly,
    listMode,
    allocationSummary,
    scopeFilters,
  } = useNursePatientScope();

  useEffect(() => {
    refreshPermissions?.();
  }, [refreshPermissions]);

  useEffect(() => {
    setPage(1);
  }, [status, severity, unassignedOnly, alertType, wardName, debouncedSearch, fromDate, toDate, allocatedOnly]);

  const alertFilters = useMemo(
    () => ({
      status,
      severity: severity || undefined,
      unassigned: unassignedOnly || undefined,
      alert_type: alertType.trim() || undefined,
      ward_name: wardName.trim() || undefined,
      search: debouncedSearch || undefined,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      page,
      limit: 20,
      // Explicit scope — drives both API param and React Query cache key.
      allocated_only: allocatedOnly ? true : undefined,
      _scopeMode: allocatedOnly ? 'allocated' : 'all',
    }),
    [
      status,
      severity,
      unassignedOnly,
      alertType,
      wardName,
      debouncedSearch,
      fromDate,
      toDate,
      page,
      allocatedOnly,
    ],
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useNurseAlertsQuery(
    alertFilters,
    { enabled: scopeReady && canViewAlerts },
  );

  const { data: bedPatients } = useNurseBedPatientsQuery(
    { page: 1, page_size: 100, ...scopeFilters },
    { enabled: scopeReady && canViewAlerts },
  );

  const wardOptions = useMemo(() => {
    const names = new Set();
    for (const row of bedPatients?.items ?? []) {
      const name = String(row.ward_name ?? '').trim();
      if (name) names.add(name);
    }
    for (const row of data?.items ?? []) {
      const name = String(row.ward_name ?? '').trim();
      if (name) names.add(name);
    }
    const selected = wardName.trim();
    if (selected) names.add(selected);
    const list = [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return list.length ? list : ['General', 'ICU', 'Private'];
  }, [bedPatients?.items, data?.items, wardName]);
  const {
    data: summary,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    error: summaryError,
    refetch: refetchSummary,
  } = useNurseAlertSummaryQuery(
    {
      allocated_only: allocatedOnly ? true : undefined,
      _scopeMode: allocatedOnly ? 'allocated' : 'all',
    },
    { enabled: canViewAlerts },
  );

  const hasActiveFilters = Boolean(
    severity || unassignedOnly || alertType.trim() || wardName.trim() || search.trim() || fromDate || toDate
  );

  const applyKpiFilter = (filter) => {
    setPage(1);
    setStatus('active');

    if (kpiFilter === filter) {
      setKpiFilter(null);
      setSeverity('');
      setUnassignedOnly(false);
      return;
    }

    setKpiFilter(filter);
    if (filter === KPI_FILTERS.active) {
      setSeverity('');
      setUnassignedOnly(false);
    } else if (filter === KPI_FILTERS.critical) {
      setSeverity('critical');
      setUnassignedOnly(false);
    } else if (filter === KPI_FILTERS.unassigned) {
      setSeverity('');
      setUnassignedOnly(true);
    }
  };

  const clearFilters = () => {
    setKpiFilter(null);
    setSeverity('');
    setUnassignedOnly(false);
    setAlertType('');
    setWardName('');
    setSearch('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const columns = useMemo(
    () => [
      {
        header: 'Patient name',
        render: (row) => row.patient_name?.trim() || '—',
      },
      { header: 'Patient ID', render: (row) => formatPatientIdDisplay(row) },
      {
        header: 'Type',
        render: (row) => <span className="nurse-alerts__type">{row.alert_type || '—'}</span>,
      },
      {
        header: 'Severity',
        render: (row) => <NurseSeverityBadge severity={row.severity} />,
      },
      { header: 'Ward', accessor: 'ward_name' },
      {
        header: 'Status',
        render: (row) => <NurseQueueStatusBadge status={row.status} />,
      },
      {
        header: 'Triggered',
        render: (row) =>
          row.triggered_at ? new Date(row.triggered_at).toLocaleString() : '—',
      },
      {
        header: 'Actions',
        render: (row) => (
          <button
            type="button"
            className="nurse-alerts__view-btn"
            onClick={() => navigate(`/nurse/alerts/${row.id}`)}
          >
            View
          </button>
        ),
      },
    ],
    [navigate]
  );

  const alertRowClassName = (row) =>
    row.severity?.toLowerCase() === 'critical' ? 'nurse-row--critical' : '';

  return (
    <NurseLayout>
      <div className="nurse-page nurse-alerts-page">
        {!canViewAlerts ? (
          <div className="nurse-alert nurse-alert--error">
            You do not have permission to view emergency alerts.
          </div>
        ) : (
          <>
        <div className="nurse-alerts-page__header nurse-card">
          <div className="nurse-alerts-page__header-left">
            <div className="nurse-alerts-page__icon" aria-hidden>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h1 className="nurse-alerts-page__title">Emergency Alerts</h1>
              <p className="nurse-alerts-page__subtitle">
                {allocatedOnly
                  ? `Allocated filter · ${allocationSummary?.assigned_bed_count ?? 0} beds assigned`
                  : 'All patients · hospital-wide alerts'}
              </p>
            </div>
          </div>
          <NursePermissionButton
            allowed={canCreateAlerts}
            className="nurse-btn nurse-btn--primary nurse-alerts-page__raise"
            onClick={() => navigate(ROUTES.NURSE_ALERTS_NEW)}
          >
            <Plus size={15} />
            Raise Alert
          </NursePermissionButton>
        </div>

        <QueryFeedback
          isLoading={isSummaryLoading && !summary}
          isError={isSummaryError}
          error={summaryError}
          onRetry={refetchSummary}
        >
          {summary ? (
            <div className="nurse-alerts-kpi">
              <button
                type="button"
                className={`nurse-card nurse-kpi nurse-kpi--filter${
                  kpiFilter === KPI_FILTERS.active ? ' nurse-kpi--filter-active' : ''
                }`}
                onClick={() => applyKpiFilter(KPI_FILTERS.active)}
                aria-pressed={kpiFilter === KPI_FILTERS.active}
              >
                <p className="nurse-kpi__label">Active</p>
                <p className="nurse-kpi__value">{summary.active_total ?? 0}</p>
              </button>
              <button
                type="button"
                className={`nurse-card nurse-kpi nurse-kpi--red nurse-kpi--filter${
                  kpiFilter === KPI_FILTERS.critical ? ' nurse-kpi--filter-active' : ''
                }`}
                onClick={() => applyKpiFilter(KPI_FILTERS.critical)}
                aria-pressed={kpiFilter === KPI_FILTERS.critical}
              >
                <p className="nurse-kpi__label">Critical</p>
                <p className="nurse-kpi__value">{summary.critical_count ?? 0}</p>
              </button>
              <button
                type="button"
                className={`nurse-card nurse-kpi nurse-kpi--yellow nurse-kpi--filter${
                  kpiFilter === KPI_FILTERS.unassigned ? ' nurse-kpi--filter-active' : ''
                }`}
                onClick={() => applyKpiFilter(KPI_FILTERS.unassigned)}
                aria-pressed={kpiFilter === KPI_FILTERS.unassigned}
              >
                <p className="nurse-kpi__label">Unassigned</p>
                <p className="nurse-kpi__value">{summary.unassigned_count ?? 0}</p>
              </button>
            </div>
          ) : (
            <div className="nurse-card nurse-alerts-page__empty-summary">No alert summary available.</div>
          )}
        </QueryFeedback>

        <div className="nurse-card nurse-alerts-filters">
          <div className="nurse-alerts-filters__toolbar">
            <div className="nurse-alerts-status-tabs" role="tablist" aria-label="Alert status">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={status === tab.id}
                  className={`nurse-alerts-status-tabs__btn ${
                    status === tab.id ? 'nurse-alerts-status-tabs__btn--active' : ''
                  }`}
                  onClick={() => {
                    setStatus(tab.id);
                    setKpiFilter(null);
                    setUnassignedOnly(false);
                    if (tab.id !== 'active') setSeverity('');
                    setPage(1);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {hasActiveFilters && (
              <button type="button" className="nurse-alerts-filters__clear" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>

          <div className="nurse-alerts-filters__grid">
            <div className="nurse-field nurse-alerts-filters__search">
              <label htmlFor="nurse-alerts-search">Search</label>
              <div className="nurse-alerts-search-wrap">
                <Search size={16} className="nurse-alerts-search-icon" aria-hidden />
                <input
                  id="nurse-alerts-search"
                  type="search"
                  className="nurse-input nurse-alerts-search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Alert ID, patient, or notes…"
                  aria-label="Search alerts"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="nurse-field nurse-alerts-filters__severity">
              <label htmlFor="nurse-alerts-severity">Severity</label>
              <select
                id="nurse-alerts-severity"
                className="nurse-select nurse-alerts-filters__control"
                value={severity}
                onChange={(e) => {
                  const next = e.target.value;
                  setSeverity(next);
                  setUnassignedOnly(false);
                  setKpiFilter(next === 'critical' ? KPI_FILTERS.critical : null);
                  setPage(1);
                }}
                aria-label="Filter by severity"
              >
                <option value="">All severity</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="nurse-field nurse-alerts-filters__type">
              <label htmlFor="nurse-alerts-type">Alert type</label>
              <select
                id="nurse-alerts-type"
                className="nurse-select nurse-alerts-filters__control"
                value={alertType}
                onChange={(e) => {
                  setAlertType(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by alert type"
              >
                <option value="">All types</option>
                {ALERT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="nurse-field nurse-alerts-filters__ward">
              <label htmlFor="nurse-alerts-ward">Ward</label>
              <select
                id="nurse-alerts-ward"
                className="nurse-select nurse-alerts-filters__control"
                value={wardName}
                onChange={(e) => {
                  setWardName(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by ward"
              >
                <option value="">All wards</option>
                {wardOptions.map((ward) => (
                  <option key={ward} value={ward}>
                    {ward}
                  </option>
                ))}
              </select>
            </div>

            <div className="nurse-field nurse-alerts-filters__date">
              <DateInput
                id="nurse-alerts-from"
                label="From date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter from date"
              />
            </div>

            <div className="nurse-field nurse-alerts-filters__date">
              <DateInput
                id="nurse-alerts-to"
                label="To date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter to date"
              />
            </div>
          </div>
        </div>

        <QueryFeedback
          isLoading={isLoading && !data}
          isError={isError}
          error={error}
          onRetry={refetch}
        >
          <div className={`nurse-alerts-table${isFetching ? ' nurse-alerts-table--fetching' : ''}`}>
            <div className="nurse-alerts-table__head">
              <h2 className="nurse-section-title">
                {status === 'active' ? 'Active alerts' : 'Resolved alerts'}
                <span className={`nurse-alerts-scope-pill nurse-alerts-scope-pill--${listMode}`}>
                  {allocatedOnly ? 'Allocated' : 'All'}
                </span>
              </h2>
              <p className="nurse-alerts-table__count">
                {isLoading && !data ? (
                  'Loading…'
                ) : (
                  <>
                    <strong>{data?.total ?? 0}</strong>
                    {' '}
                    {(data?.total ?? 0) === 1 ? 'alert' : 'alerts'}
                    {hasActiveFilters ? ' matching filters' : ''}
                  </>
                )}
              </p>
            </div>

            <NurseDataTable
              columns={columns}
              data={data?.items || []}
              isLoading={false}
              emptyMessage={
                allocatedOnly
                  ? (allocationSummary?.assigned_bed_count
                    ? 'No alerts for patients on your allocated beds.'
                    : 'No beds assigned this shift — Allocated filter shows no alerts. Switch to All to see hospital-wide alerts.')
                  : 'No alerts match the current filters.'
              }
              rowClassName={alertRowClassName}
            />

            <NursePagination
              page={page}
              pageSize={20}
              total={data?.total}
              itemCount={data?.items?.length ?? 0}
              onChange={setPage}
            />
          </div>
        </QueryFeedback>
          </>
        )}
      </div>
    </NurseLayout>
  );
}
