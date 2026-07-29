import { Modal, Button, MoneyAmount } from '@/shared/components/common';
import { formatCurrency } from '@/shared/utils/formatCurrency';

/**
 * Confirm Generate Bill — does not change submission payload or API logic.
 */
export default function OpdBillConfirmDialog({
  open,
  onClose,
  onConfirm,
  confirming,
  summary,
}) {
  if (!summary) return null;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Confirm Generate Bill"
      size="md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={confirming}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={confirming}>
            {confirming ? 'Saving...' : 'Confirm'}
          </Button>
        </>
      }
    >
      <dl className="opd-bill-confirm">
        {summary.patientName ? (
          <div className="opd-bill-confirm__row">
            <dt>Patient</dt>
            <dd>{summary.patientName}</dd>
          </div>
        ) : null}
        {summary.uhid ? (
          <div className="opd-bill-confirm__row">
            <dt>Patient ID</dt>
            <dd>{summary.uhid}</dd>
          </div>
        ) : null}
        {summary.doctorName ? (
          <div className="opd-bill-confirm__row">
            <dt>Doctor</dt>
            <dd>{summary.doctorName}</dd>
          </div>
        ) : null}
        {summary.deptName ? (
          <div className="opd-bill-confirm__row">
            <dt>Department</dt>
            <dd>{summary.deptName}</dd>
          </div>
        ) : null}
        {summary.appointmentLabel ? (
          <div className="opd-bill-confirm__row">
            <dt>Appointment</dt>
            <dd>{summary.appointmentLabel}</dd>
          </div>
        ) : null}
        <div className="opd-bill-confirm__row">
          <dt>Bill amount</dt>
          <dd>
            <MoneyAmount amount={summary.grandTotal} strong />
          </dd>
        </div>
        {Number(summary.outstanding) > 0.01 ? (
          <div className="opd-bill-confirm__row">
            <dt>Outstanding</dt>
            <dd>{formatCurrency(summary.outstanding)}</dd>
          </div>
        ) : null}
        {summary.todayBillCount > 0 ? (
          <div className="opd-bill-confirm__row">
            <dt>Today&apos;s existing bills</dt>
            <dd>{summary.todayBillCount}</dd>
          </div>
        ) : null}
      </dl>
    </Modal>
  );
}
