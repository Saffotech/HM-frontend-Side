import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Plus } from 'lucide-react';
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
} from '@/shared/hooks/queries/useNurseQuery';
import { ROUTES } from '@/shared/constants';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';

const STATUS_TABS = [
  { id: 'active', label: 'Active' },
  { id: 'resolved', label: 'Resolved' },
];

export default function NurseAlertsPage() {
  const navigate = useNavigate();
  const { canCreateAlerts, canViewAlerts } = useNursePermissionSet();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('active');
  const [severity, setSeverity] = useState('');
  const [alertType, setAlertType] = useState('');
  const [wardName, setWardName] = useState('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 400);

  const { data, isLoading, isError, error, refetch } = useNurseAlertsQuery({
    status,
    severity: severity || undefined,
    alert_type: alertType || undefined,
    ward_name: wardName.trim() || undefined,
    search: debouncedSearch || undefined,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
    page,
    limit: 20,
  });
  const {
    data: summary,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    error: summaryError,
    refetch: refetchSummary,
  } = useNurseAlertSummaryQuery({ enabled: canViewAlerts });

  const hasActiveFilters = Boolean(
    severity || alertType.trim() || wardName.trim() || search.trim() || fromDate || toDate
  );

  const clearFilters = () => {
    setSeverity('');
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
        header: 'Alert ID',
        render: (row) => <span className="nurse-alerts__uid">{row.alert_uid || `#${row.id}`}</span>,
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
        <div className="nurse-alerts-page__header nurse-card">
          <div className="nurse-alerts-page__header-left">
            <div className="nurse-alerts-page__icon" aria-hidden>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h1 className="nurse-alerts-page__title">Emergency Alerts</h1>
              <p className="nurse-alerts-page__subtitle">Monitor and respond to patient emergencies</p>
            </div>
          </div>
          {canCreateAlerts && (
            <button
              type="button"
              className="nurse-btn nurse-btn--primary nurse-alerts-page__raise"
              onClick={() => navigate(ROUTES.NURSE_ALERTS_NEW)}
            >
              <Plus size={15} />
              Raise Alert
            </button>
          )}
        </div>

        <QueryFeedback
          isLoading={isSummaryLoading}
          isError={isSummaryError}
          error={summaryError}
          onRetry={refetchSummary}
        >
          {summary ? (
            <div className="nurse-alerts-kpi">
              <div className="nurse-card nurse-kpi nurse-kpi--static">
                <p className="nurse-kpi__label">Active</p>
                <p className="nurse-kpi__value">{summary.active_total ?? 0}</p>
              </div>
              <div className="nurse-card nurse-kpi nurse-kpi--red nurse-kpi--static">
                <p className="nurse-kpi__label">Critical</p>
                <p className="nurse-kpi__value">{summary.critical_count ?? 0}</p>
              </div>
              <div className="nurse-card nurse-kpi nurse-kpi--yellow nurse-kpi--static">
                <p className="nurse-kpi__label">Unassigned</p>
                <p className="nurse-kpi__value">{summary.unassigned_count ?? 0}</p>
              </div>
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
              <label htmlFor="nurse-alerts-search" className="nurse-alerts-filters__sr-label">
                Search
              </label>
              <div className="nurse-alerts-search-wrap">
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
                />
              </div>
            </div>

            <div className="nurse-field">
              <label htmlFor="nurse-alerts-severity" className="nurse-alerts-filters__sr-label">
                Severity
              </label>
              <select
                id="nurse-alerts-severity"
                className="nurse-select nurse-alerts-filters__control"
                value={severity}
                onChange={(e) => {
                  setSeverity(e.target.value);
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

            <div className="nurse-field">
              <label htmlFor="nurse-alerts-type" className="nurse-alerts-filters__sr-label">
                Alert type
              </label>
              <input
                id="nurse-alerts-type"
                type="text"
                className="nurse-input nurse-alerts-filters__control"
                value={alertType}
                onChange={(e) => {
                  setAlertType(e.target.value);
                  setPage(1);
                }}
                placeholder="Alert type"
                aria-label="Filter by alert type"
              />
            </div>

            <div className="nurse-field">
              <label htmlFor="nurse-alerts-ward" className="nurse-alerts-filters__sr-label">
                Ward
              </label>
              <input
                id="nurse-alerts-ward"
                type="text"
                className="nurse-input nurse-alerts-filters__control"
                value={wardName}
                onChange={(e) => {
                  setWardName(e.target.value);
                  setPage(1);
                }}
                placeholder="Ward"
                aria-label="Filter by ward"
              />
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

        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
          <div className="nurse-alerts-table">
            <div className="nurse-alerts-table__head">
              <h2 className="nurse-section-title">
                {status === 'active' ? 'Active alerts' : 'Resolved alerts'}
              </h2>
              <p className="nurse-alerts-table__count">
                {isLoading ? (
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
              emptyMessage="No alerts match the current filters."
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
      </div>
    </NurseLayout>
  );
}
