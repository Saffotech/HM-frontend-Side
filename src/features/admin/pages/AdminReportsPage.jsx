import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Banknote,
  Building2,
  CalendarRange,
  IndianRupee,
  RotateCcw,
  Stethoscope,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import {
  defaultReportDateRange,
  formatReportDate,
  scopeReportsOverview,
  scopeReportsVisits,
} from '@/features/manager/utils/reportUtils';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import {
  useAdminDashboardQuery,
  useAdminDepartmentsQuery,
  useAdminReportsOverviewQuery,
  useAdminReportsVisitsQuery,
} from '@/shared/hooks/queries/useAdminQuery';
import {
  DateInput,
  QueryFeedback,
  Select,
  TablePagination,
} from '@/shared/components/common';
import { formatRoleLabel } from '@/features/admin/utils/permissionPresentation';
import { isPlatformOrganizationRole } from '@/features/manager/utils/hospitalManagerRoles';

const PAGE_SIZE = 20;

const SOURCE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'opd', label: 'OPD' },
  { value: 'ipd', label: 'IPD' },
];

const SOURCE_COPY = {
  all: {
    volumeLabel: 'Encounters',
    volumeHint: 'completed',
    ledgerTitle: 'Encounter ledger',
    ledgerItem: 'encounters',
    ledgerEmpty: 'No encounters match the current filters.',
    deptTitle: 'Encounters by department',
    deptEmpty: 'No department encounters in this period.',
    stripLabel: 'encounters in table',
  },
  opd: {
    volumeLabel: 'Total visits',
    volumeHint: 'completed',
    ledgerTitle: 'Visit ledger',
    ledgerItem: 'visits',
    ledgerEmpty: 'No visits match the current filters.',
    deptTitle: 'Visits by department',
    deptEmpty: 'No department visits in this period.',
    stripLabel: 'visits in table',
  },
  ipd: {
    volumeLabel: 'Admissions',
    volumeHint: 'discharged',
    ledgerTitle: 'IPD ledger',
    ledgerItem: 'admissions',
    ledgerEmpty: 'No admissions match the current filters.',
    deptTitle: 'Admissions by department',
    deptEmpty: 'No department admissions in this period.',
    stripLabel: 'admissions in table',
  },
};

const ROLE_BAR_TONES = {
  super_admin: '#1A5C34',
  admin: '#164C2B',
  doctor: '#16A34A',
  nurse: '#2563EB',
  pharmacist: '#D4AF37',
  opd_billing: '#F59E0B',
  lab_technician: '#475467',
  receptionist: '#667085',
};

function formatPeriodLabel(from, to) {
  if (!from || !to) return 'Select a date range';
  const fromLabel = formatReportDate(from);
  const toLabel = formatReportDate(to);
  return `${fromLabel} — ${toLabel}`;
}

function formatPaymentMode(mode) {
  if (!mode) return 'Unknown';
  return mode.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function PaymentStatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase();
  const tone = normalized === 'paid' ? 'paid' : normalized === 'pending' ? 'pending' : 'neutral';
  return (
    <span className={`admin-panel-reports-status admin-panel-reports-status--${tone}`}>
      {status || '—'}
    </span>
  );
}

function SourceBadge({ source }) {
  const normalized = String(source || 'opd').toLowerCase() === 'ipd' ? 'ipd' : 'opd';
  return (
    <span className={`admin-panel-reports-status admin-panel-reports-status--${normalized}`}>
      {normalized.toUpperCase()}
    </span>
  );
}

function ledgerRowKey(row, index) {
  const source = String(row?.source || 'opd').toLowerCase();
  const id = row?.visit_id ?? row?.admission_id ?? row?.bill_id ?? index;
  return `${source}-${id}`;
}

function ledgerRowSource(row) {
  return String(row?.source || 'opd').toLowerCase() === 'ipd' ? 'ipd' : 'opd';
}

function KpiCard({ label, value, hint, icon: Icon, tone = 'default' }) {
  return (
    <article className={`admin-panel-reports-kpi-card admin-panel-reports-kpi-card--${tone}`}>
      <div className="admin-panel-reports-kpi-card__icon" aria-hidden>
        <Icon size={20} strokeWidth={2.1} />
      </div>
      <div className="admin-panel-reports-kpi-card__body">
        <span className="admin-panel-reports-kpi-card__label">{label}</span>
        <strong className="admin-panel-reports-kpi-card__value">{value}</strong>
        {hint ? <span className="admin-panel-reports-kpi-card__hint">{hint}</span> : null}
      </div>
    </article>
  );
}

function InsightPanel({ title, subtitle, children, className = '' }) {
  return (
    <section className={`admin-panel-reports-panel ${className}`.trim()}>
      <header className="admin-panel-reports-panel__head">
        <h2 className="admin-panel-reports-panel__title">{title}</h2>
        {subtitle ? <p className="admin-panel-reports-panel__sub">{subtitle}</p> : null}
      </header>
      <div className="admin-panel-reports-panel__body">{children}</div>
    </section>
  );
}

/* Legacy identifier preserved: SuperAdminReportsPage. Active name: AdminReportsPage. */
export default function AdminReportsPage() {
  const [range, setRange] = useState(defaultReportDateRange);
  const [source, setSource] = useState('all');
  const [departmentId, setDepartmentId] = useState('all');
  const [page, setPage] = useState(1);

  const dashboardQuery = useAdminDashboardQuery();
  const departmentsQuery = useAdminDepartmentsQuery();
  const copy = SOURCE_COPY[source] || SOURCE_COPY.all;

  useEffect(() => {
    setPage(1);
  }, [range.from_date, range.to_date, departmentId, source]);

  const overviewFilters = useMemo(() => {
    const params = {
      from_date: range.from_date,
      to_date: range.to_date,
      source,
    };
    if (departmentId !== 'all') params.department_id = Number(departmentId);
    return params;
  }, [range.from_date, range.to_date, source, departmentId]);

  const reportFilters = useMemo(
    () => ({
      ...overviewFilters,
      page,
      limit: PAGE_SIZE,
    }),
    [overviewFilters, page],
  );

  const overviewQuery = useAdminReportsOverviewQuery(overviewFilters);
  const visitsQuery = useAdminReportsVisitsQuery(reportFilters);

  const isLoading = overviewQuery.isLoading || visitsQuery.isLoading;
  const isError = overviewQuery.isError || visitsQuery.isError;
  const error = overviewQuery.error || visitsQuery.error;

  const dashboard = dashboardQuery.data;
  const overview = useMemo(
    () => scopeReportsOverview(overviewQuery.data, source),
    [overviewQuery.data, source],
  );
  const scopedVisits = useMemo(
    () => scopeReportsVisits(visitsQuery.data, source),
    [visitsQuery.data, source],
  );
  const visits = scopedVisits.visits;
  const visitsTotal = scopedVisits.total;
  const totalPages = Math.max(1, Math.ceil(visitsTotal / PAGE_SIZE));
  const departments = departmentsQuery.data;

  const staffByRole = useMemo(() => {
    const rows = (dashboard?.staff_by_role ?? []).filter(
      (row) => !isPlatformOrganizationRole(row.role_name),
    );
    return rows
      .map((row) => ({
        key: row.role_name,
        role: formatRoleLabel(row.role_name),
        count: row.count,
        tone: ROLE_BAR_TONES[row.role_name] || '#1A5C34',
      }))
      .sort((a, b) => b.count - a.count);
  }, [dashboard?.staff_by_role]);

  const visitsByDepartment = useMemo(() => {
    const rows = overview?.visits_by_department ?? [];
    return [...rows].sort((a, b) => b.visit_count - a.visit_count);
  }, [overview?.visits_by_department]);

  const revenueByMode = useMemo(() => {
    const rows = overview?.revenue_by_payment_mode ?? [];
    return [...rows].sort((a, b) => b.total_amount - a.total_amount);
  }, [overview?.revenue_by_payment_mode]);

  const departmentOptions = useMemo(
    () => [
      { value: 'all', label: 'All departments' },
      ...(departments?.map((dept) => ({
        value: String(dept.id),
        label: dept.name,
      })) ?? []),
    ],
    [departments],
  );

  const completionRate = useMemo(() => {
    const total = overview?.total_visits ?? 0;
    const completed = overview?.completed_visits ?? 0;
    if (!total) return '0%';
    return `${Math.round((completed / total) * 100)}%`;
  }, [overview?.completed_visits, overview?.total_visits]);

  const resetFilters = () => {
    setRange(defaultReportDateRange());
    setSource('all');
    setDepartmentId('all');
    setPage(1);
  };

  const refetch = () => {
    dashboardQuery.refetch();
    overviewQuery.refetch();
    visitsQuery.refetch();
  };

  return (
    <AdminLayout pageTitle="Reports">
      <div className="admin-page admin-panel-reports-page">
        <header className="admin-panel-reports-hero">
          <div className="admin-panel-reports-hero__copy">
            <h1 className="admin-panel-reports-hero__title">Reports</h1>
            <p className="admin-panel-reports-hero__period">
              <CalendarRange size={15} aria-hidden />
              {formatPeriodLabel(range.from_date, range.to_date)}
            </p>
          </div>
        </header>

        <div className="admin-panel-reports-toolbar">
          <div className="admin-panel-reports-toolbar__row">
            <DateInput
              label="From"
              value={range.from_date}
              onChange={(e) => setRange((prev) => ({ ...prev, from_date: e.target.value }))}
              className="admin-panel-reports-toolbar__date"
            />
            <DateInput
              label="To"
              value={range.to_date}
              onChange={(e) => setRange((prev) => ({ ...prev, to_date: e.target.value }))}
              className="admin-panel-reports-toolbar__date"
            />
            <Select
              label="Source"
              value={source}
              onChange={setSource}
              options={SOURCE_OPTIONS}
              className="admin-panel-reports-toolbar__source"
            />
            <Select
              label="Department"
              value={departmentId}
              onChange={setDepartmentId}
              options={departmentOptions}
              className="admin-panel-reports-toolbar__select"
            />
            <button type="button" className="admin-panel-reports-toolbar__reset" onClick={resetFilters}>
              <RotateCcw size={15} aria-hidden />
              Reset
            </button>
          </div>
        </div>

        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
          <section className="admin-panel-reports-kpi-grid" aria-label="Key metrics">
            <KpiCard
              tone="revenue"
              icon={IndianRupee}
              label="Collected revenue"
              value={formatCurrency(overview?.collected_revenue ?? 0)}
            />
            <KpiCard
              tone="visits"
              icon={Activity}
              label={copy.volumeLabel}
              value={overview?.total_visits?.toLocaleString() ?? '0'}
              hint={
                overview?.total_visits
                  ? `${overview?.completed_visits ?? 0} ${copy.volumeHint} · ${completionRate}`
                  : null
              }
            />
            <KpiCard
              tone="patients"
              icon={UserPlus}
              label="New patients"
              value={overview?.new_patients_in_period?.toLocaleString() ?? '0'}
              hint={`${overview?.total_patients?.toLocaleString() ?? '0'} total registered`}
            />
            <KpiCard
              tone="pending"
              icon={Wallet}
              label="Pending payments"
              value={overview?.pending_payments?.toLocaleString() ?? '0'}
            />
          </section>

          <section className="admin-panel-reports-staff-strip" aria-label="Staff overview">
            <div className="admin-panel-reports-staff-strip__item">
              <Users size={16} aria-hidden />
              <span>
                <strong>{dashboard?.total_staff ?? '—'}</strong>
                {' '}
                total staff
              </span>
            </div>
            <div className="admin-panel-reports-staff-strip__item">
              <UserCheck size={16} aria-hidden />
              <span>
                <strong>{dashboard?.active_staff ?? '—'}</strong>
                {' '}
                active
              </span>
            </div>
            <div className="admin-panel-reports-staff-strip__item">
              <Stethoscope size={16} aria-hidden />
              <span>
                <strong>{dashboard?.total_departments ?? '—'}</strong>
                {' '}
                departments
              </span>
            </div>
            <div className="admin-panel-reports-staff-strip__item">
              <Banknote size={16} aria-hidden />
              <span>
                <strong>{visitsTotal.toLocaleString()}</strong>
                {' '}
                {copy.stripLabel}
              </span>
            </div>
          </section>

          <div className="admin-panel-reports-insights">
            <InsightPanel
              title="Staff by role"
              subtitle="Headcount across hospital roles"
              className="admin-panel-reports-insights__staff"
            >
              {!staffByRole.length ? (
                <p className="admin-panel-reports-empty">No staff data available.</p>
              ) : (
                <ul className="admin-panel-reports-role-bars">
                  {staffByRole.map((row) => {
                    const max = Math.max(1, ...staffByRole.map((item) => item.count));
                    const pct = Math.max(8, (row.count / max) * 100);
                    return (
                      <li key={row.key} className="admin-panel-reports-role-bar">
                        <div className="admin-panel-reports-role-bar__meta">
                          <span className="admin-panel-reports-role-bar__label">{row.role}</span>
                          <span className="admin-panel-reports-role-bar__value">{row.count}</span>
                        </div>
                        <div className="admin-panel-reports-role-bar__track">
                          <span
                            className="admin-panel-reports-role-bar__fill"
                            style={{ width: `${pct}%`, background: row.tone }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </InsightPanel>

            <InsightPanel
              title={copy.deptTitle}
              subtitle="Volume in selected period"
              className="admin-panel-reports-insights__departments"
            >
              {!visitsByDepartment.length ? (
                <p className="admin-panel-reports-empty">{copy.deptEmpty}</p>
              ) : (
                <ul className="admin-panel-reports-dept-list">
                  {visitsByDepartment.slice(0, 8).map((row) => {
                    const max = Math.max(1, ...visitsByDepartment.map((item) => item.visit_count));
                    const pct = Math.max(6, (row.visit_count / max) * 100);
                    return (
                      <li key={row.department_id} className="admin-panel-reports-dept-item">
                        <div className="admin-panel-reports-dept-item__head">
                          <span className="admin-panel-reports-dept-item__name">
                            <Building2 size={14} aria-hidden />
                            {row.department_name}
                          </span>
                          <span className="admin-panel-reports-dept-item__count">{row.visit_count}</span>
                        </div>
                        <div className="admin-panel-reports-dept-item__track">
                          <span className="admin-panel-reports-dept-item__fill" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </InsightPanel>

            <InsightPanel
              title="Revenue by payment mode"
              subtitle="Collections breakdown"
              className="admin-panel-reports-insights__payments"
            >
              {!revenueByMode.length ? (
                <p className="admin-panel-reports-empty">No payment data in this period.</p>
              ) : (
                <ul className="admin-panel-reports-payment-list">
                  {revenueByMode.map((row) => (
                    <li key={row.payment_mode} className="admin-panel-reports-payment-item">
                      <div>
                        <span className="admin-panel-reports-payment-item__mode">
                          {formatPaymentMode(row.payment_mode)}
                        </span>
                        <span className="admin-panel-reports-payment-item__count">
                          {row.transaction_count}
                          {' '}
                          transactions
                        </span>
                      </div>
                      <strong className="admin-panel-reports-payment-item__amount">
                        {formatCurrency(row.total_amount)}
                      </strong>
                    </li>
                  ))}
                </ul>
              )}
            </InsightPanel>
          </div>

          <InsightPanel
            title={copy.ledgerTitle}
            subtitle={`${visitsTotal.toLocaleString()} ${copy.ledgerItem} · filtered results`}
            className="admin-panel-reports-visits"
          >
            {!visits.length ? (
              <p className="admin-panel-reports-empty">{copy.ledgerEmpty}</p>
            ) : (
              <>
                <div className="admin-panel-reports-table-wrap">
                  <table className="admin-panel-reports-table admin-table--stack">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Source</th>
                        <th>Department</th>
                        <th>Bill</th>
                        <th>Token</th>
                        <th className="admin-panel-reports-table__num">Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visits.map((row, index) => (
                        <tr key={ledgerRowKey(row, index)}>
                          <td className="admin-panel-reports-table__date" data-label="Date">
                            <span>{row.visit_date ? formatReportDate(row.visit_date) : '—'}</span>
                          </td>
                          <td data-label="Source">
                            <SourceBadge source={ledgerRowSource(row)} />
                          </td>
                          <td data-label="Department"><span>{row.department_name || '—'}</span></td>
                          <td className="admin-panel-reports-table__mono" data-label="Bill">
                            <span>{row.bill_number || '—'}</span>
                          </td>
                          <td className="admin-panel-reports-table__mono" data-label="Token">
                            <span>{row.token_number || row.admission_no || '—'}</span>
                          </td>
                          <td className="admin-panel-reports-table__num admin-panel-reports-table__amount" data-label="Amount">
                            <span>{formatCurrency(row.grand_total)}</span>
                          </td>
                          <td data-label="Status">
                            <PaymentStatusBadge status={row.payment_status || row.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePagination
                  page={page}
                  totalPages={totalPages}
                  totalItems={visitsTotal}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                  itemLabel={copy.ledgerItem}
                />
              </>
            )}
          </InsightPanel>
        </QueryFeedback>
      </div>
    </AdminLayout>
  );
}
