import { AlertCircle, CalendarX, IndianRupee, Receipt, Wallet } from 'lucide-react';
import { MoneyAmount, Skeleton, StatCard } from '@/shared/components/common';

function percent(part, whole) {
  if (!whole) return 0;
  return Math.min(100, Math.round((Number(part) / Number(whole)) * 100));
}

function MetricGroup({ title, icon: Icon, meter, cards, isLoading }) {
  return (
    <section className="card today-overview__group">
      <header className="today-overview__group-head">
        <span className="today-overview__group-icon" aria-hidden>
          <Icon size={16} />
        </span>
        <h2>{title}</h2>
        {meter ? (
          <div className="today-overview__meter" title={`${meter.label} ${meter.value}%`}>
            <span className="today-overview__meter-label">
              {meter.label} <strong>{meter.value}%</strong>
            </span>
            <span className="today-overview__meter-track">
              <span
                className={`today-overview__meter-fill today-overview__meter-fill--${meter.tone}`}
                style={{ width: `${meter.value}%` }}
              />
            </span>
          </div>
        ) : null}
      </header>

      <div className="today-overview__group-grid">
        {cards.map((card) => (
          <StatCard
            key={card.key}
            label={card.label}
            value={isLoading ? <Skeleton width={64} height={26} /> : card.value}
            description={card.description}
            icon={card.icon}
            tone={card.tone}
            className="today-overview__tile"
          />
        ))}
      </div>
    </section>
  );
}

export default function OverviewStats({ stats, isLoading }) {
  const collectionRate = percent(stats.collected, stats.billedToday);

  const billingCards = [
    {
      key: 'bills',
      label: 'Bills Generated',
      value: stats.billsGenerated,
      icon: Receipt,
      tone: 'default',
      description: (
        <>
          <MoneyAmount amount={stats.billedToday} exact /> billed
        </>
      ),
    },
    {
      key: 'collected',
      label: 'Amount Collected',
      value: <MoneyAmount amount={stats.collected} exact />,
      icon: IndianRupee,
      tone: 'success',
      description: 'Payments received today',
    },
    {
      key: 'pending',
      label: 'Pending Bills',
      value: stats.pendingBills,
      icon: AlertCircle,
      tone: 'warning',
      description: (
        <>
          <MoneyAmount amount={stats.outstanding} exact /> outstanding
        </>
      ),
    },
    {
      key: 'cancelled',
      label: 'Cancelled Appointments',
      value: stats.cancelledAppointments,
      icon: CalendarX,
      tone: 'danger',
      description: 'Cancelled or not honoured',
    },
  ];

  return (
    <div className="today-overview__groups">
      <MetricGroup
        title="Billing & Revenue"
        icon={Wallet}
        meter={{ label: 'Collected', value: collectionRate, tone: 'success' }}
        cards={billingCards}
        isLoading={isLoading}
      />
    </div>
  );
}
