/**
 * Add Patient Payment modal — collects patient payment details for the claim API.
 */

import { useEffect, useState } from 'react';
import { Modal, Button, DateInput } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import { formatCurrency, currencyAmountLabel } from '@/shared/utils/formatCurrency';

const PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'Cheque', 'Other'];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY = {
  amount: '',
  paymentDate: todayIso(),
  paymentMode: 'Cash',
  reference: '',
};

export default function AddPatientPaymentModal({
  open,
  onClose,
  outstanding = 0,
  onSave,
}) {
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setValues({ ...EMPTY, paymentDate: todayIso() });
    setError('');
  }, [open]);

  const set = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setError('');
  };

  const handleClose = () => {
    setValues(EMPTY);
    setError('');
    onClose?.();
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const amount = Number(values.amount);
    if (!values.amount || Number.isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!values.paymentDate) {
      setError('Payment date is required');
      return;
    }
    if (!values.paymentMode) {
      setError('Select a payment mode');
      return;
    }

    onSave?.({
      amount,
      paymentDate: values.paymentDate,
      paymentMode: values.paymentMode,
      reference: values.reference.trim(),
    });
    toast.success('Patient payment saved');
    handleClose();
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Add Patient Payment"
      size="md"
      panelClassName="ipd-ins-pay-modal"
      footer={
        <div className="ipd-xfer-modal__actions">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form="ipd-pat-pay-form">
            Save Payment
          </Button>
        </div>
      }
    >
      <form
        id="ipd-pat-pay-form"
        className="ipd-modal-form"
        onSubmit={onSubmit}
      >
        <p className="ipd-page__subtitle" style={{ margin: '0 0 0.85rem' }}>
          Patient outstanding for this claim: {formatCurrency(outstanding, { empty: '—' })} —{' '}
          partial payments allowed.
        </p>

        <div className="ipd-form-grid ipd-ins-pay-modal__grid">
          <div className="ipd-toolbar__field">
            <label className="ipd-toolbar__label" htmlFor="ipd-pat-pay-amount">
              {currencyAmountLabel('Amount')}
            </label>
            <input
              id="ipd-pat-pay-amount"
              className="ipd-input"
              value={values.amount}
              onChange={(e) => set('amount', e.target.value)}
              inputMode="decimal"
              placeholder="Enter amount"
            />
          </div>

          <div className="ipd-toolbar__field">
            <label className="ipd-toolbar__label" htmlFor="ipd-pat-pay-date">
              Payment Date
            </label>
            <DateInput
              id="ipd-pat-pay-date"
              className="ipd-date-input"
              value={values.paymentDate}
              onChange={(e) => set('paymentDate', e.target.value)}
              placeholder="DD/MM/YYYY"
              aria-label="Payment date"
            />
          </div>

          <div className="ipd-toolbar__field">
            <label className="ipd-toolbar__label" htmlFor="ipd-pat-pay-mode">
              Payment Mode
            </label>
            <select
              id="ipd-pat-pay-mode"
              className="ipd-select"
              value={values.paymentMode}
              onChange={(e) => set('paymentMode', e.target.value)}
            >
              {PAYMENT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>

          <div className="ipd-toolbar__field">
            <label className="ipd-toolbar__label" htmlFor="ipd-pat-pay-ref">
              Reference Number
            </label>
            <input
              id="ipd-pat-pay-ref"
              className="ipd-input"
              value={values.reference}
              onChange={(e) => set('reference', e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        {error ? (
          <p
            className="ipd-field-error"
            role="alert"
            style={{ marginTop: '0.65rem' }}
          >
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
