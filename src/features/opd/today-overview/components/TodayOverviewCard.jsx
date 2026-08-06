import { Link } from 'react-router-dom';
import { ChevronRight, CalendarClock } from 'lucide-react';
import { useOpdDashboardQuery } from '@/shared/hooks/queries/useOpdDashboardQuery';
import { asBillList } from '@/shared/hooks/queries/listDataUtils';
import { MoneyAmount, Skeleton } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { useTodayBillsQuery } from '../hooks/useTodayBillsQuery';
import './TodayOverviewCard.css';

/**
 * Dashboard entry point for the Today's Overview page.
 * Reads the same cached queries the overview page uses.
 */
export default function TodayOverviewCard() {
  const { data: dashboard, isLoading: dashboardLoading } = useOpdDashboardQuery();
  const { data: billsData, isLoading: billsLoading } = useTodayBillsQuery();

  const bills = asBillList(billsData);
  const collected = billsData?.summary?.total_collected
    ?? bills.reduce((total, bill) => total + (Number(bill.paid) || 0), 0);
  const pendingPayments = bills.filter((bill) => Number(bill.balance ?? 0) > 0.01).length;
  const isLoading = dashboardLoading || billsLoading;

  const rows = [
    { key: 'visits', label: "Today's Visits", value: dashboard?.visitsToday ?? 0 },
    { key: 'bills', label: 'Bills Generated', value: bills.length },
    {
      key: 'collected',
      label: 'Collected Today',
      value: <MoneyAmount amount={collected} exact />,
    },
    { key: 'pending', label: 'Pending Payments', value: pendingPayments },
  ];

  return (
    <Link
      to={ROUTES.OPD_TODAY_OVERVIEW}
      className="today-overview-card ui-interactive"
      aria-label="Open today's overview"
    >
      <div className="today-overview-card__bar" />
      <div className="today-overview-card__body">
        <div className="today-overview-card__head">
          <span className="today-overview-card__icon" aria-hidden>
            <CalendarClock size={18} />
          </span>
          <h3>Today&apos;s Overview</h3>
          <span className="today-overview-card__cta">
            View
            <ChevronRight size={16} aria-hidden />
          </span>
        </div>

        <ul className="today-overview-card__rows">
          {rows.map((row) => (
            <li key={row.key} className="today-overview-card__row">
              <span className="today-overview-card__label">{row.label}</span>
              <span className="today-overview-card__value">
                {isLoading ? <Skeleton width={48} height={14} /> : row.value}
              </span>
              <ChevronRight size={14} className="today-overview-card__chevron" aria-hidden />
            </li>
          ))}
        </ul>
      </div>
    </Link>
  );
}
