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
import SuperAdminLayout from '@/features/super-admin/components/SuperAdminLayout';
import {
  defaultReportDateRange,
  formatCurrency,
  formatReportDate,
} from '@/features/admin/utils/reportUtils';
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
import { formatRoleLabel } from '@/features/super-admin/utils/permissionPresentation';

const PAGE_SIZE = 20;

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
    <span className={`sa-reports-status sa-reports-status--${tone}`}>
      {status || '—'}
    </span>
  );
}

function KpiCard({ label, value, hint, icon: Icon, tone = 'default' }) {
  return (
    <article className={`sa-reports-kpi-card sa-reports-kpi-card--${tone}`}>
      <div className="sa-reports-kpi-card__icon" aria-hidden>
        <Icon size={20} strokeWidth={2.1} />
      </div>
      <div className="sa-reports-kpi-card__body">
        <span className="sa-reports-kpi-card__label">{label}</span>
        <strong className="sa-reports-kpi-card__value">{value}</strong>
        {hint ? <span className="sa-reports-kpi-card__hint">{hint}</span> : null}
      </div>
    </article>
  );
}

function InsightPanel({ title, subtitle, children, className = '' }) {
  return (
    <section className={`sa-reports-panel ${className}`.trim()}>
      <header className="sa-reports-panel__head">
        <h2 className="sa-reports-panel__title">{title}</h2>
        {subtitle ? <p className="sa-reports-panel__sub">{subtitle}</p> : null}
      </header>
      <div className="sa-reports-panel__body">{children}</div>
    </section>
  );
}

export default function SuperAdminReportsPage() {
  const [range, setRange] = useState(defaultReportDateRange);
  const [departmentId, setDepartmentId] = useState('all');
  const [page, setPage] = useState(1);

  const dashboardQuery = useAdminDashboardQuery();
  const departmentsQuery = useAdminDepartmentsQuery();

  useEffect(() => {
    setPage(1);
  }, [range.from_date, range.to_date, departmentId]);

  const reportFilters = useMemo(() => {
    const params = {
      from_date: range.from_date,
      to_date: range.to_date,
      page,
      limit: PAGE_SIZE,
    };
    if (departmentId !== 'all') params.department_id = Number(departmentId);
    return params;
  }, [range.from_date, range.to_date, departmentId, page]);

  const overviewQuery = useAdminReportsOverviewQuery({
    from_date: range.from_date,
    to_date: range.to_date,
  });
  const visitsQuery = useAdminReportsVisitsQuery(reportFilters);

  const isLoading = overviewQuery.isLoading || visitsQuery.isLoading;
  const isError = overviewQuery.isError || visitsQuery.isError;
  const error = overviewQuery.error || visitsQuery.error;

  const dashboard = dashboardQuery.data;
  const overview = overviewQuery.data;
  const visits = visitsQuery.data?.visits ?? [];
  const visitsTotal = visitsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(visitsTotal / PAGE_SIZE));
  const departments = departmentsQuery.data;

  const staffByRole = useMemo(() => {
    const rows = dashboard?.staff_by_role ?? [];
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
    setDepartmentId('all');
    setPage(1);
  };

  const refetch = () => {
    dashboardQuery.refetch();
    overviewQuery.refetch();
    visitsQuery.refetch();
  };

  return (
    <SuperAdminLayout pageTitle="Reports">
      <div className="admin-page sa-reports-page">
        <header className="sa-reports-hero">
          <div className="sa-reports-hero__copy">
            <h1 className="sa-reports-hero__title">Reports</h1>
            <p className="sa-reports-hero__period">
              <CalendarRange size={15} aria-hidden />
              {formatPeriodLabel(range.from_date, range.to_date)}
            </p>
          </div>
        </header>

        <div className="sa-reports-toolbar">
          <div className="sa-reports-toolbar__row">
            <DateInput
              label="From"
              value={range.from_date}
              onChange={(e) => setRange((prev) => ({ ...prev, from_date: e.target.value }))}
              className="sa-reports-toolbar__date"
            />
            <DateInput
              label="To"
              value={range.to_date}
              onChange={(e) => setRange((prev) => ({ ...prev, to_date: e.target.value }))}
              className="sa-reports-toolbar__date"
            />
            <Select
              label="Department"
              value={departmentId}
              onChange={setDepartmentId}
              options={departmentOptions}
              className="sa-reports-toolbar__select"
            />
            <button type="button" className="sa-reports-toolbar__reset" onClick={resetFilters}>
              <RotateCcw size={15} aria-hidden />
              Reset
            </button>
          </div>
          <p className="sa-reports-toolbar__note" role="note">
            Department filter applies to the visit ledger only.
          </p>
        </div>

        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
          <section className="sa-reports-kpi-grid" aria-label="Key metrics">
            <KpiCard
              tone="revenue"
              icon={IndianRupee}
              label="Collected revenue"
              value={formatCurrency(overview?.collected_revenue ?? 0)}
              hint={`${formatCurrency(overview?.outstanding_revenue ?? 0)} outstanding`}
            />
            <KpiCard
              tone="visits"
              icon={Activity}
              label="Total visits"
              value={overview?.total_visits?.toLocaleString() ?? '0'}
              hint={`${overview?.completed_visits ?? 0} completed · ${completionRate}`}
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
              hint={`Billed ${formatCurrency(overview?.total_revenue ?? 0)}`}
            />
          </section>

          <section className="sa-reports-staff-strip" aria-label="Staff overview">
            <div className="sa-reports-staff-strip__item">
              <Users size={16} aria-hidden />
              <span>
                <strong>{dashboard?.total_staff ?? '—'}</strong>
                {' '}
                total staff
              </span>
            </div>
            <div className="sa-reports-staff-strip__item">
              <UserCheck size={16} aria-hidden />
              <span>
                <strong>{dashboard?.active_staff ?? '—'}</strong>
                {' '}
                active
              </span>
            </div>
            <div className="sa-reports-staff-strip__item">
              <Stethoscope size={16} aria-hidden />
              <span>
                <strong>{dashboard?.total_departments ?? '—'}</strong>
                {' '}
                departments
              </span>
            </div>
            <div className="sa-reports-staff-strip__item">
              <Banknote size={16} aria-hidden />
              <span>
                <strong>{visitsTotal.toLocaleString()}</strong>
                {' '}
                visits in table
              </span>
            </div>
          </section>

          <div className="sa-reports-insights">
            <InsightPanel
              title="Staff by role"
              subtitle="Headcount across hospital roles"
              className="sa-reports-insights__staff"
            >
              {!staffByRole.length ? (
                <p className="sa-reports-empty">No staff data available.</p>
              ) : (
                <ul className="sa-reports-role-bars">
                  {staffByRole.map((row) => {
                    const max = Math.max(1, ...staffByRole.map((item) => item.count));
                    const pct = Math.max(8, (row.count / max) * 100);
                    return (
                      <li key={row.key} className="sa-reports-role-bar">
                        <div className="sa-reports-role-bar__meta">
                          <span className="sa-reports-role-bar__label">{row.role}</span>
                          <span className="sa-reports-role-bar__value">{row.count}</span>
                        </div>
                        <div className="sa-reports-role-bar__track">
                          <span
                            className="sa-reports-role-bar__fill"
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
              title="Visits by department"
              subtitle="Volume in selected period"
              className="sa-reports-insights__departments"
            >
              {!visitsByDepartment.length ? (
                <p className="sa-reports-empty">No department visits in this period.</p>
              ) : (
                <ul className="sa-reports-dept-list">
                  {visitsByDepartment.slice(0, 8).map((row) => {
                    const max = Math.max(1, ...visitsByDepartment.map((item) => item.visit_count));
                    const pct = Math.max(6, (row.visit_count / max) * 100);
                    return (
                      <li key={row.department_id} className="sa-reports-dept-item">
                        <div className="sa-reports-dept-item__head">
                          <span className="sa-reports-dept-item__name">
                            <Building2 size={14} aria-hidden />
                            {row.department_name}
                          </span>
                          <span className="sa-reports-dept-item__count">{row.visit_count}</span>
                        </div>
                        <div className="sa-reports-dept-item__track">
                          <span className="sa-reports-dept-item__fill" style={{ width: `${pct}%` }} />
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
              className="sa-reports-insights__payments"
            >
              {!revenueByMode.length ? (
                <p className="sa-reports-empty">No payment data in this period.</p>
              ) : (
                <ul className="sa-reports-payment-list">
                  {revenueByMode.map((row) => (
                    <li key={row.payment_mode} className="sa-reports-payment-item">
                      <div>
                        <span className="sa-reports-payment-item__mode">
                          {formatPaymentMode(row.payment_mode)}
                        </span>
                        <span className="sa-reports-payment-item__count">
                          {row.transaction_count}
                          {' '}
                          transactions
                        </span>
                      </div>
                      <strong className="sa-reports-payment-item__amount">
                        {formatCurrency(row.total_amount)}
                      </strong>
                    </li>
                  ))}
                </ul>
              )}
            </InsightPanel>
          </div>

          <InsightPanel
            title="Visit ledger"
            subtitle={`${visitsTotal.toLocaleString()} visits · filtered results`}
            className="sa-reports-visits"
          >
            {!visits.length ? (
              <p className="sa-reports-empty">No visits match the current filters.</p>
            ) : (
              <>
                <div className="sa-reports-table-wrap">
                  <table className="sa-reports-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Department</th>
                        <th>Bill</th>
                        <th>Token</th>
                        <th className="sa-reports-table__num">Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visits.map((row) => (
                        <tr key={row.visit_id}>
                          <td className="sa-reports-table__date">
                            {row.visit_date ? formatReportDate(row.visit_date) : '—'}
                          </td>
                          <td>{row.department_name || '—'}</td>
                          <td className="sa-reports-table__mono">{row.bill_number || '—'}</td>
                          <td className="sa-reports-table__mono">{row.token_number || '—'}</td>
                          <td className="sa-reports-table__num sa-reports-table__amount">
                            {formatCurrency(row.grand_total)}
                          </td>
                          <td>
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
                  itemLabel="visits"
                />
              </>
            )}
          </InsightPanel>
        </QueryFeedback>
      </div>
    </SuperAdminLayout>
  );
}
