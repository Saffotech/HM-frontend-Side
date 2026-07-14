import { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  Banknote,
  CircleDollarSign,
  Stethoscope,
  Users,
  Wallet,
} from 'lucide-react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminBarChart from '@/features/admin/components/AdminBarChart';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader';
import AdminReportFilters from '@/features/admin/components/AdminReportFilters';
import AdminStatCard from '@/features/admin/components/AdminStatCard';
import {
  defaultReportDateRange,
  formatCurrency,
  normalizeReportsOverviewPayments,
} from '@/features/admin/utils/reportUtils';
import { useAdminReportsOverviewQuery } from '@/shared/hooks/queries/useAdminQuery';
import { QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';

export default function ReportsOverviewPage() {
  const [range, setRange] = useState(defaultReportDateRange);

  const filters = useMemo(
    () => ({ from_date: range.from_date, to_date: range.to_date }),
    [range]
  );

  const { data: rawData, isLoading, isError, error, refetch } = useAdminReportsOverviewQuery(filters);
  const data = useMemo(() => normalizeReportsOverviewPayments(rawData), [rawData]);

  return (
    <AdminLayout pageTitle="Reports">
      <div className="admin-page admin-page--compact">
        <AdminPageHeader
          title="Reports overview"
          actions={(
            <nav className="admin-subnav" aria-label="Report sections">
              <NavLink
                to={ROUTES.ADMIN_REPORTS}
                end
                className={({ isActive }) =>
                  `admin-subnav__link${isActive ? ' admin-subnav__link--active' : ''}`
                }
              >
                Overview
              </NavLink>
              <NavLink
                to={ROUTES.ADMIN_REPORTS_VISITS}
                className={({ isActive }) =>
                  `admin-subnav__link${isActive ? ' admin-subnav__link--active' : ''}`
                }
              >
                Visits
              </NavLink>
            </nav>
          )}
        />

        <AdminReportFilters
          inline
          fromDate={range.from_date}
          toDate={range.to_date}
          onFromChange={(value) => setRange((prev) => ({ ...prev, from_date: value }))}
          onToChange={(value) => setRange((prev) => ({ ...prev, to_date: value }))}
        />

        <QueryFeedback
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={refetch}
        >
          {data && (
            <>
              <div className="admin-stats admin-stats--reports">
                <AdminStatCard
                  title="Total patients"
                  value={data.total_patients}
                  icon={<Users size={18} />}
                  isLoading={isLoading}
                  tone="primary"
                />
                <AdminStatCard
                  title="New patients"
                  value={data.new_patients_in_period}
                  icon={<Users size={18} />}
                  isLoading={isLoading}
                  tone="info"
                />
                <AdminStatCard
                  title="Total visits"
                  value={data.total_visits}
                  icon={<Stethoscope size={18} />}
                  isLoading={isLoading}
                  tone="neutral"
                />
                <AdminStatCard
                  title="Completed visits"
                  value={data.completed_visits}
                  icon={<Activity size={18} />}
                  isLoading={isLoading}
                  tone="success"
                />
                <AdminStatCard
                  title="Pending payments"
                  value={data.pending_payments}
                  icon={<Wallet size={18} />}
                  isLoading={isLoading}
                  tone="warning"
                />
                <AdminStatCard
                  title="Total revenue"
                  value={formatCurrency(data.total_revenue)}
                  icon={<CircleDollarSign size={18} />}
                  isLoading={isLoading}
                  tone="primary"
                />
                <AdminStatCard
                  title="Collected"
                  value={formatCurrency(data.collected_revenue)}
                  icon={<Banknote size={18} />}
                  isLoading={isLoading}
                  tone="success"
                />
              </div>

              <div className="admin-detail-grid">
                <div className="admin-card admin-card--flat">
                  <div className="admin-card__header">
                    <h2 className="admin-card__title">Visits by department</h2>
                    <p className="admin-card__desc">Distribution of visits across clinical units.</p>
                  </div>
                  <div className="admin-card__body">
                    <AdminBarChart
                      items={data.visits_by_department}
                      labelKey="department_name"
                      valueKey="visit_count"
                    />
                  </div>
                </div>

                <div className="admin-card admin-card--flat">
                  <div className="admin-card__header">
                    <h2 className="admin-card__title">Revenue by payment mode</h2>
                    <p className="admin-card__desc">Collected amounts grouped by payment channel.</p>
                  </div>
                  <div className="admin-card__body">
                    <AdminBarChart
                      items={data.revenue_by_payment_mode}
                      labelKey="payment_mode"
                      valueKey="total_amount"
                      formatValue={(value, item) =>
                        `${formatCurrency(value)} (${item.transaction_count} txns)`
                      }
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </QueryFeedback>
      </div>
    </AdminLayout>
  );
}
