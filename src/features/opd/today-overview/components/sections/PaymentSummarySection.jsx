import { Link } from 'react-router-dom';
import { ArrowUpRight, Banknote, CreditCard, ShieldCheck, Smartphone, Wallet } from 'lucide-react';
import { MoneyAmount } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import OverviewSection from '../OverviewSection';

const MODE_META = {
  Cash: { icon: Banknote, tone: 'success' },
  Card: { icon: CreditCard, tone: 'info' },
  UPI: { icon: Smartphone, tone: 'primary' },
  Insurance: { icon: ShieldCheck, tone: 'warning' },
  Cheque: { icon: Wallet, tone: 'muted' },
};

export default function PaymentSummarySection({ section }) {
  const modes = section.modes ?? [];
  const collected = section.collected ?? 0;
  const transactions = section.transactions ?? 0;

  return (
    <OverviewSection
      title="Payment Summary"
      icon={Wallet}
      subtitle={`${transactions} transaction${transactions === 1 ? '' : 's'} today`}
      action={
        <Link to={ROUTES.PAYMENT_HISTORY} className="today-overview__link">
          History
          <ArrowUpRight size={14} aria-hidden />
        </Link>
      }
      isLoading={section.isLoading}
      isError={section.isError}
      error={section.error}
      isEmpty={collected === 0 && transactions === 0}
      emptyIcon={Wallet}
      emptyTitle="No payments collected yet"
      emptyDescription="Cash, card, UPI and insurance collections are broken down here."
      skeletonRows={3}
    >
      <div className="today-overview__modes">
        {modes.map((mode) => {
          const meta = MODE_META[mode.mode] ?? { icon: Wallet, tone: 'muted' };
          const Icon = meta.icon;
          const share = collected > 0 ? Math.round((mode.amount / collected) * 100) : 0;
          return (
            <div key={mode.mode} className="today-overview__mode">
              <span
                className={`today-overview__mode-icon today-overview__mode-icon--${meta.tone}`}
                aria-hidden
              >
                <Icon size={15} />
              </span>
              <div className="today-overview__mode-main">
                <div className="today-overview__mode-top">
                  <span className="today-overview__mode-label">{mode.mode}</span>
                  <MoneyAmount amount={mode.amount} exact strong />
                </div>
                <span className="today-overview__mode-track">
                  <span
                    className={`today-overview__mode-fill today-overview__mode-fill--${meta.tone}`}
                    style={{ width: `${share}%` }}
                  />
                </span>
                <span className="today-overview__mode-meta">
                  {mode.count} txn{mode.count === 1 ? '' : 's'} · {share}% of collections
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="today-overview__panel-footer">
        <span>Total collected today</span>
        <MoneyAmount amount={collected} exact strong />
      </div>
    </OverviewSection>
  );
}
