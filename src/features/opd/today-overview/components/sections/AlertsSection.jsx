import { AlertTriangle, BellOff, BellRing, CalendarX, Timer } from 'lucide-react';
import { Badge, MoneyAmount } from '@/shared/components/common';
import OverviewSection from '../OverviewSection';

const ALERT_ICONS = {
  'pending-bills': AlertTriangle,
  'long-waiting': Timer,
  cancelled: CalendarX,
};

export default function AlertsSection({ section }) {
  const rows = section.rows ?? [];

  return (
    <OverviewSection
      title="Needs Attention"
      icon={BellRing}
      subtitle="Clear these before end of day"
      action={
        rows.length > 0 ? (
          <Badge variant={rows.some((row) => row.tone === 'danger') ? 'cancelled' : 'pending'}>
            {rows.length}
          </Badge>
        ) : null
      }
      isLoading={section.isLoading}
      isError={section.isError}
      error={section.error}
      isEmpty={rows.length === 0}
      emptyIcon={BellOff}
      emptyTitle="Nothing needs attention"
      emptyDescription="Pending payments, long waits and cancellations would be flagged here."
      skeletonRows={2}
    >
      <ul className="today-overview__alerts">
        {rows.map((alert) => {
          const Icon = ALERT_ICONS[alert.id] ?? AlertTriangle;
          return (
            <li
              key={alert.id}
              className={`today-overview__alert today-overview__alert--${alert.tone}`}
            >
              <span className="today-overview__alert-icon" aria-hidden>
                <Icon size={16} />
              </span>
              <div className="today-overview__alert-body">
                <strong>{alert.title}</strong>
                {alert.description ? <span>{alert.description}</span> : null}
              </div>
              {alert.amount != null ? (
                <span className="today-overview__alert-amount">
                  <MoneyAmount amount={alert.amount} exact strong />
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </OverviewSection>
  );
}
