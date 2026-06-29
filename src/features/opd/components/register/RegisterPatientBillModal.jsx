import { CalendarDays } from 'lucide-react';
import { Button, Input, Modal, MoneyAmount, Select } from '@/shared/components/common';
import { requiresTransactionReference } from '@/shared/utils/validators';

export default function RegisterPatientBillModal({
  isOpen,
  billPreview,
  paymentAmount,
  paymentMode,
  paymentRef,
  paymentRefError,
  isSaving,
  onClose,
  onPaymentAmountChange,
  onPaymentModeChange,
  onPaymentRefChange,
  onConfirm,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bill Preview & Payment"
      size="lg"
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>Back</Button>
          <Button onClick={onConfirm} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Confirm & Register'}
          </Button>
        </>
      )}
    >
      {billPreview && (
        <div className="bill-preview">
          <p>
            Bill: <strong>{billPreview.billId}</strong> — Total:{' '}
            <MoneyAmount amount={billPreview.total} strong />
          </p>
          {billPreview.appointment && (
            <div className="register-appointment__summary">
              <CalendarDays size={16} aria-hidden />
              <span>
                Appointment: <strong>{billPreview.appointment.displayDate}</strong> at{' '}
                <strong>{billPreview.appointment.time}</strong> with Dr.{' '}
                {billPreview.doctor?.name}
              </span>
            </div>
          )}
          <Input
            label="Amount Received"
            type="number"
            value={paymentAmount}
            onChange={(e) => onPaymentAmountChange(e.target.value)}
            max={billPreview.total}
          />
          <Select
            label="Payment Mode"
            value={paymentMode}
            onChange={onPaymentModeChange}
            options={[
              { value: 'Cash', label: 'Cash' },
              { value: 'Card', label: 'Card' },
              { value: 'UPI', label: 'UPI' },
            ]}
          />
          {requiresTransactionReference(paymentMode) && (
            <Input
              label="Transaction / Reference No"
              value={paymentRef}
              onChange={(e) => onPaymentRefChange(e.target.value)}
              error={paymentRefError}
              placeholder="e.g. UPI ref or card auth code"
            />
          )}
        </div>
      )}
    </Modal>
  );
}
