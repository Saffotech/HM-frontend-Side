import { Link } from 'react-router-dom';
import { ChevronRight, CalendarClock } from 'lucide-react';
import { useOpdDashboardQuery } from '@/shared/hooks/queries/useOpdDashboardQuery';
import { MoneyAmount, Skeleton } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import './TodayOverviewCard.css';

/**
 * Dashboard summary card. Each row opens the matching main page.
 * Numbers come from GET /opd/dashboard (shared with DashboardPage).
 */
export default function TodayOverviewCard() {
  const { data: dashboard, isLoading } = useOpdDashboardQuery();

  const rows = [
    {
      key: 'visits',
      label: "Today's Visits",
      value: dashboard?.visitsToday ?? 0,
      to: `${ROUTES.PATIENTS}?registered=today`,
    },
    {
      key: 'bills',
      label: 'Bills Generated',
      value: dashboard?.todayBillsCount ?? 0,
      to: ROUTES.BILLING,
    },
    {
      key: 'collected',
      label: 'Collected Today',
      value: <MoneyAmount amount={dashboard?.todayCollected ?? 0} exact />,
      to: ROUTES.PAYMENT_HISTORY,
    },
    {
      key: 'pending',
      label: 'Pending Payments',
      value: dashboard?.todayPendingPayments ?? 0,
      to: `${ROUTES.BILLING}?status=Unpaid`,
    },
  ];

  return (
    <section className="today-overview-card" aria-label="Today's overview">
      <div className="today-overview-card__bar" />
      <div className="today-overview-card__body">
        <div className="today-overview-card__head">
          <span className="today-overview-card__icon" aria-hidden>
            <CalendarClock size={18} />
          </span>
          <h3>Today&apos;s Overview</h3>
        </div>

        <ul className="today-overview-card__rows">
          {rows.map((row) => (
            <li key={row.key}>
              <Link
                to={row.to}
                className="today-overview-card__row"
                aria-label={`Open ${row.label}`}
              >
                <span className="today-overview-card__label">{row.label}</span>
                <span className="today-overview-card__value">
                  {isLoading ? <Skeleton width={48} height={14} /> : row.value}
                </span>
                <ChevronRight size={14} className="today-overview-card__chevron" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
