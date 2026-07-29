import { AlertTriangle } from 'lucide-react';
import { Button, MoneyAmount } from '@/shared/components/common';
import { formatCurrency } from '@/shared/utils/formatCurrency';

/**
 * Contextual existing-bill warning with Create Anyway action.
 * Never blocks Generate Bill — acknowledgment only softens the alert.
 */
export default function OpdBillExistingBillAlert({
  billingContext,
  duplicateBills = [],
  acknowledged,
  onAcknowledge,
}) {
  const primary =
    duplicateBills[0] ??
    billingContext?.primaryOpen ??
    billingContext?.todayBills?.[0] ??
    null;

  const show =
    Boolean(primary) ||
    billingContext?.openTodayCount > 0 ||
    billingContext?.appointmentHasBill;

  if (!show) return null;

  if (acknowledged) {
    return (
      <div className="opd-alert opd-alert--info" role="status">
        <span>
          Creating an additional bill for this patient. Existing bill
          {primary?.billNumber || primary?.id ? ` ${primary.billNumber || primary.id}` : ''} remains
          unchanged.
        </span>
      </div>
    );
  }

  const billLabel = primary?.billNumber || primary?.id;

  return (
    <div className="opd-alert opd-alert--warn opd-alert--with-actions" role="status">
      <div className="opd-alert__body opd-alert__body--inline">
        <p className="opd-alert__title">
          <AlertTriangle size={16} aria-hidden className="opd-alert__title-icon" />
          {billingContext?.appointmentHasBill && billLabel
            ? `This appointment already has Bill #${billLabel}`
            : billLabel
              ? `Patient already has Bill #${billLabel}`
              : 'Patient already has a bill for today'}
        </p>
        <Button type="button" size="sm" onClick={onAcknowledge}>
          Create New Bill Anyway
        </Button>
      </div>
    </div>
  );
}

export function OpdBillOutstandingBanner({ outstanding, onNavigate }) {
  if (!(Number(outstanding) > 0.01)) return null;
  return (
    <button
      type="button"
      className="opd-outstanding-banner"
      onClick={onNavigate}
      aria-label={`Outstanding balance ${formatCurrency(outstanding)}. Open billing.`}
    >
      <span className="opd-outstanding-banner__label">Outstanding Balance</span>
      <span className="opd-outstanding-banner__amount">
        <MoneyAmount amount={outstanding} strong />
      </span>
    </button>
  );
}
