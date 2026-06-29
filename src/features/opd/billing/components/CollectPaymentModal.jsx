import { useState, useEffect, useMemo } from 'react';
import {
  useBillsQuery,
  useCollectPaymentMutation,
  useBillInvoiceQuery,
  BILLS_PAGE_SIZE,
} from '@/shared/hooks/queries/useBillingQuery';
import { asBillList } from '@/shared/hooks/queries/listDataUtils';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { billItemsWithNonZeroAmount, billLineAmount } from '@/shared/utils/billHelpers';
import { trimForm } from '@/shared/utils/trimForm';
import { validatePaymentTransactionRef, requiresTransactionReference } from '@/shared/utils/validators';
import { useFormValidation } from '@/shared/hooks/useFormValidation';
import { toast } from '@/shared/utils/toast';
import { PAYMENT_MODES } from '@/shared/constants';
import {
  Modal,
  Button,
  Input,
  Select,
  MoneyAmount,
} from '@/shared/components/common';
import './CollectPaymentModal.css';

function validatePayment(values, maxAmount) {
  const errors = {};
  if (!values.selectedBillId) errors.selectedBillId = 'Bill is required';
  const amount = Number(values.amount);
  if (!values.amount || isNaN(amount) || amount <= 0) {
    errors.amount = 'Amount must be greater than 0';
  } else if (maxAmount != null && amount > maxAmount) {
    errors.amount = `Amount cannot exceed ${formatCurrency(maxAmount)}`;
  }
  if (!values.mode) errors.mode = 'Payment mode is required';
  const refError = validatePaymentTransactionRef(values.mode, values.refNo, {
    paidAmount: amount,
  });
  if (refError) errors.refNo = refError;
  return errors;
}

export default function CollectPaymentModal({ open, onClose, defaultBillId }) {
  const { data: billsData } = useBillsQuery({
    fetchAll: true,
    enabled: open,
  });
  const { data: defaultBillData } = useBillsQuery({
    fetchAll: false,
    search: defaultBillId || undefined,
    page: 1,
    limit: BILLS_PAGE_SIZE,
    enabled: open && Boolean(defaultBillId),
  });

  const bills = asBillList(billsData);
  const defaultBills = asBillList(defaultBillData);
  const unpaidBills = bills.filter((b) => b.status !== 'Paid');
  const collectPayment = useCollectPaymentMutation();
  const [formState, setFormState] = useState({
    selectedBillId: defaultBillId || '',
    amount: '',
    mode: 'Cash',
    refNo: '',
  });

  const bill =
    bills.find((b) => b.id === formState.selectedBillId) ??
    defaultBills.find((b) => b.id === formState.selectedBillId);

  const { data: invoiceBill, isLoading: invoiceLoading } = useBillInvoiceQuery(
    bill?.visitId,
    { enabled: open && Boolean(bill?.visitId) },
  );

  const lineItems = useMemo(
    () => billItemsWithNonZeroAmount(invoiceBill?.items ?? bill?.items ?? []),
    [invoiceBill?.items, bill?.items],
  );

  const gstAmount = Number(invoiceBill?.gstAmount ?? 0);
  const gstLabel = invoiceBill?.gstLabel ?? 'GST';

  const { values, errors, handleChange, handleSubmit, setValues } = useFormValidation(
    formState,
    (v) => validatePayment(v, bill?.balance)
  );

  useEffect(() => {
    setValues({
      selectedBillId: defaultBillId || '',
      amount: '',
      mode: 'Cash',
      refNo: '',
    });
    setFormState({
      selectedBillId: defaultBillId || '',
      amount: '',
      mode: 'Cash',
      refNo: '',
    });
  }, [defaultBillId, open, setValues]);

  const set = (key, val) => {
    handleChange(key, val);
    setFormState((prev) => ({ ...prev, [key]: val }));
  };

  const onSubmit = handleSubmit((rawValues) => {
    const trimmed = trimForm(rawValues);
    const selectedBill =
      bills.find((b) => b.id === trimmed.selectedBillId) ??
      defaultBills.find((b) => b.id === trimmed.selectedBillId);
    if (!selectedBill) return;
    if (!selectedBill.visitId) {
      toast.error('Missing visit for this bill. Refresh and try again.');
      return;
    }
    const numAmount = Number(trimmed.amount);
    collectPayment.mutate(
      {
        billId: selectedBill.visitId,
        payment: {
          date: new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          amount: numAmount,
          mode: trimmed.mode,
          ref: trimmed.refNo || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success(`Payment of ${formatCurrency(numAmount)} collected successfully`);
          onClose();
        },
      }
    );
  });

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Collect Payment"
      panelClassName="collect-payment-modal"
      footer={
        bill ? (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="success" disabled={collectPayment.isPending} onClick={onSubmit}>
              {collectPayment.isPending ? 'Saving...' : 'Collect & Update'}
            </Button>
          </>
        ) : null
      }
    >
      <form onSubmit={onSubmit} className="collect-payment">
        {!defaultBillId && (
          <>
            <Select
              label="Select Bill (Unpaid/Partial)"
              value={values.selectedBillId}
              onChange={(v) => set('selectedBillId', v)}
              placeholder="Select a bill..."
              options={unpaidBills.map((b) => ({
                value: b.id,
                label: `${b.id} - ${b.patientName} (${b.patientId}) — Due: ${formatCurrency(b.balance)}`,
              }))}
            />
            {errors.selectedBillId && (
              <span className="field__error">{errors.selectedBillId}</span>
            )}
          </>
        )}

        {bill && (
          <>
            <div className="collect-payment__detail">
              <dl className="collect-payment__meta">
                <div className="collect-payment__row">
                  <dt>Patient</dt>
                  <dd>{bill.patientName}</dd>
                </div>
                <div className="collect-payment__row">
                  <dt>Patient ID</dt>
                  <dd>{bill.patientId}</dd>
                </div>
                <div className="collect-payment__row">
                  <dt>Bill ID</dt>
                  <dd>{bill.id}</dd>
                </div>
              </dl>

              <div className="collect-payment__section">
                <h4 className="collect-payment__section-title">Bill breakdown</h4>
                {invoiceLoading ? (
                  <p className="collect-payment__muted">Loading fee details...</p>
                ) : lineItems.length ? (
                  <ul className="collect-payment__lines">
                    {lineItems.map((item) => (
                      <li
                        key={`${item.name}-${item.qty}-${item.unitPrice}`}
                        className="collect-payment__row collect-payment__row--line"
                      >
                        <span className="collect-payment__line-name">
                          {item.name}
                          {Number(item.qty) > 1 ? ` × ${item.qty}` : ''}
                        </span>
                        <MoneyAmount amount={billLineAmount(item)} />
                      </li>
                    ))}
                    {gstAmount > 0 && (
                      <li className="collect-payment__row collect-payment__row--line collect-payment__row--tax">
                        <span className="collect-payment__line-name">{gstLabel}</span>
                        <MoneyAmount amount={gstAmount} />
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="collect-payment__muted">Fee details unavailable</p>
                )}
              </div>

              <dl className="collect-payment__totals">
                <div className="collect-payment__row">
                  <dt>Total</dt>
                  <dd>
                    <MoneyAmount amount={bill.total} strong />
                  </dd>
                </div>
                <div className="collect-payment__row">
                  <dt>Paid</dt>
                  <dd>
                    <MoneyAmount amount={bill.paid} strong />
                  </dd>
                </div>
                <div className="collect-payment__row collect-payment__row--due">
                  <dt>Balance due</dt>
                  <dd>
                    <MoneyAmount
                      amount={bill.balance}
                      strong
                      className="collect-payment__due-amount"
                    />
                  </dd>
                </div>
              </dl>
            </div>

            <div className="collect-payment__fields">
              <Input
                label="Amount to Collect (₹)"
                type="number"
                min={1}
                max={bill.balance}
                value={values.amount}
                onChange={(e) => set('amount', e.target.value)}
                error={errors.amount}
                placeholder={`Max: ${bill.balance}`}
              />
              <div className="field collect-payment__mode-field">
                <label className="field__label" htmlFor="collect-payment-mode">
                  Payment Mode
                </label>
                <select
                  id="collect-payment-mode"
                  className="field__input"
                  value={values.mode}
                  onChange={(e) => {
                    const mode = e.target.value;
                    set('mode', mode);
                    if (!requiresTransactionReference(mode)) set('refNo', '');
                  }}
                >
                  {PAYMENT_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                {errors.mode && <span className="field__error">{errors.mode}</span>}
              </div>
            </div>
            {requiresTransactionReference(values.mode) && (
              <Input
                label="Transaction / Reference No"
                value={values.refNo}
                onChange={(e) => set('refNo', e.target.value)}
                error={errors.refNo}
                placeholder="e.g. TXN12345678"
              />
            )}
          </>
        )}
      </form>
    </Modal>
  );
}
