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
import {
  Modal,
  Button,
  Input,
  Select,
  MoneyAmount,
} from '@/shared/components/common';
import './CollectPaymentModal.css';

const COLLECT_PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'Online'];

function normalizePaymentMode(mode) {
  if (String(mode).toLowerCase() === 'online') return 'Card';
  return mode;
}

function billPatientKeys(bill) {
  return [bill?.patientId, bill?.patientUid, bill?.patientDbId]
    .filter((v) => v != null && v !== '')
    .map(String);
}

function billMatchesPatient(bill, patientUid, patientDbId) {
  const keys = billPatientKeys(bill);
  if (patientUid && keys.includes(String(patientUid))) return true;
  if (patientDbId != null && keys.includes(String(patientDbId))) return true;
  return false;
}

function normalizeBillDay(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toDateString();
  return String(value).trim().toLowerCase();
}

function pickPatientBill(candidates = [], { appointmentDate } = {}) {
  const unpaid = candidates.filter(
    (b) => b.status !== 'Paid' && Number(b.balance ?? 0) > 0.01
  );
  const pool = unpaid.length ? unpaid : candidates.filter((b) => b.status !== 'Paid');
  if (!pool.length) return null;

  if (appointmentDate) {
    const targetDay = normalizeBillDay(appointmentDate);
    const dateMatch = pool.find((b) => normalizeBillDay(b.date ?? b.dateIso) === targetDay);
    if (dateMatch) return dateMatch;
  }

  return [...pool].sort((a, b) => Number(b.balance ?? 0) - Number(a.balance ?? 0))[0];
}

function uniqueBills(...groups) {
  const seen = new Set();
  const out = [];
  for (const group of groups) {
    for (const bill of group) {
      if (!bill) continue;
      const key = bill.visitId ?? bill.id;
      if (key == null || seen.has(key)) continue;
      seen.add(key);
      out.push(bill);
    }
  }
  return out;
}

function validatePayment(values, maxAmount, hasResolvedBill) {
  const errors = {};
  if (!hasResolvedBill && !values.selectedBillId) errors.selectedBillId = 'Bill is required';
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

export default function CollectPaymentModal({
  open,
  onClose,
  defaultBillId,
  defaultVisitId,
  prefillBill,
  patientUid,
  patientDbId,
  appointmentDate,
  onCollected,
}) {
  const { data: billsData, isLoading: allBillsLoading } = useBillsQuery({
    fetchAll: true,
    enabled: open,
  });
  const patientSearch = patientUid ?? (patientDbId != null ? String(patientDbId) : undefined);
  const { data: patientBillsData, isLoading: patientBillsLoading } = useBillsQuery({
    fetchAll: false,
    search: patientSearch,
    page: 1,
    limit: BILLS_PAGE_SIZE,
    enabled: open && Boolean(patientSearch),
  });
  const { data: defaultBillData } = useBillsQuery({
    fetchAll: false,
    search: defaultBillId || undefined,
    page: 1,
    limit: BILLS_PAGE_SIZE,
    enabled: open && Boolean(defaultBillId),
  });

  const bills = asBillList(billsData);
  const patientBills = asBillList(patientBillsData);
  const defaultBills = asBillList(defaultBillData);
  const unpaidBills = bills.filter((b) => b.status !== 'Paid');
  const billsLoading = allBillsLoading || patientBillsLoading;

  const bill = useMemo(() => {
    if (prefillBill?.visitId) return prefillBill;

    const candidates = uniqueBills(bills, defaultBills, patientBills);
    const fromList =
      candidates.find(
        (b) =>
          (defaultBillId && b.id === defaultBillId) ||
          (defaultVisitId != null && b.visitId === defaultVisitId)
      ) ?? null;
    if (fromList) return fromList;

    if (prefillBill) return prefillBill;

    if (patientUid || patientDbId != null) {
      const matched = candidates.filter((b) =>
        billMatchesPatient(b, patientUid, patientDbId)
      );
      const picked = pickPatientBill(matched, { appointmentDate });
      if (picked) return picked;
    }

    return null;
  }, [
    bills,
    defaultBills,
    patientBills,
    defaultBillId,
    defaultVisitId,
    patientUid,
    patientDbId,
    appointmentDate,
    prefillBill,
  ]);

  const collectPayment = useCollectPaymentMutation();
  const [formState, setFormState] = useState({
    selectedBillId: defaultBillId || '',
    amount: '',
    mode: 'Cash',
    refNo: '',
  });

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
    (v) => validatePayment(v, bill?.balance, Boolean(bill?.visitId))
  );

  useEffect(() => {
    const resolvedBillId = bill?.id ?? defaultBillId ?? '';
    const defaultAmount =
      bill?.balance != null && bill.balance > 0 ? String(bill.balance) : '';
    setValues({
      selectedBillId: resolvedBillId,
      amount: defaultAmount,
      mode: 'Cash',
      refNo: '',
    });
    setFormState({
      selectedBillId: resolvedBillId,
      amount: defaultAmount,
      mode: 'Cash',
      refNo: '',
    });
  }, [defaultBillId, open, setValues, bill?.id, bill?.balance]);

  const set = (key, val) => {
    handleChange(key, val);
    setFormState((prev) => ({ ...prev, [key]: val }));
  };

  const onSubmit = handleSubmit((rawValues) => {
    const trimmed = trimForm(rawValues);
    const selectedBill =
      bill ??
      bills.find((b) => b.id === trimmed.selectedBillId) ??
      defaultBills.find((b) => b.id === trimmed.selectedBillId);
    if (!selectedBill?.visitId) {
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
          mode: normalizePaymentMode(trimmed.mode),
          ref: trimmed.refNo || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success(`Payment of ${formatCurrency(numAmount)} collected successfully`);
          onCollected?.();
          onClose();
        },
      }
    );
  });

  const showBillPicker =
    !patientUid && patientDbId == null && !defaultBillId && !prefillBill?.visitId;

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
        ) : (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      <form onSubmit={onSubmit} className="collect-payment">
        {showBillPicker && (
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

        {billsLoading && !bill ? (
          <p className="collect-payment__muted">Loading bill details…</p>
        ) : bill ? (
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
                  {COLLECT_PAYMENT_MODES.map((m) => (
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
        ) : (
          <p className="collect-payment__muted">
            No unpaid bill found for this appointment. Create a bill from Billing first.
          </p>
        )}
      </form>
    </Modal>
  );
}
