/**
 * Canonical IPD billing transaction model (frontend consumption shape).
 *
 * Backend contract TBD — mappers adapt API/dummy data into this structure.
 */

import {
  BILLING_SOURCE,
  BILLING_STATUS,
  resolveBillingSourceFromHead,
} from '@/features/ipd/billing/ipdBillingConstants';

/**
 * @typedef {Object} IpdBillingTransaction
 * @property {string} id
 * @property {string|null} admissionId
 * @property {string|null} patientId
 * @property {string} chargeDate ISO date YYYY-MM-DD
 * @property {string} category charge-head category (room, doctor, …)
 * @property {string} particulars item / service description
 * @property {number} quantity
 * @property {string|null} unit
 * @property {number} rate unit rate when applicable
 * @property {number} amount line total
 * @property {string} source BILLING_SOURCE value
 * @property {string|null} sourceId upstream module record id
 * @property {string} status BILLING_STATUS value
 */

/**
 * @typedef {Object} IpdFinalBillingSummary
 * @property {import('@/features/ipd/utils/insuranceChargeHeads').InsuranceChargeHead[]} chargeHeads
 * @property {number} grossBeforeDiscount
 * @property {number} discount
 * @property {number} netBill
 * @property {number} displayGross
 */

/**
 * @typedef {Object} IpdBillingBundle
 * @property {object|null} patient
 * @property {object|null} claim insurance claim snapshot (insurance flow)
 * @property {string|null} admissionId
 * @property {string|null} patientId
 * @property {string|null} claimId
 * @property {IpdBillingTransaction[]} transactions
 * @property {import('@/features/ipd/utils/insuranceDailyCharges').DailyChargeRow[]} dailyCharges UI daily rows
 * @property {IpdFinalBillingSummary} finalBilling
 * @property {'dummy'|'api'} dataSource
 */

export function normalizeBillingTransaction(row, context = {}) {
  const amount = Number(row.amount) || 0;
  const quantityRaw = Number(row.quantity);
  const quantity =
    Number.isFinite(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1;
  const rateRaw = Number(row.rate ?? row.unit_price);
  const rate = Number.isFinite(rateRaw)
    ? rateRaw
    : quantity > 0
      ? amount / quantity
      : amount;

  const head = row.head ?? row.label ?? row.category ?? '';
  let source = row.source;
  if (!source || !Object.values(BILLING_SOURCE).includes(source)) {
    source =
      row.isManual === true
        ? BILLING_SOURCE.MANUAL
        : resolveBillingSourceFromHead(head);
  }

  return {
    id: String(row.id ?? `bill-tx-${Date.now()}`),
    admissionId: row.admissionId ?? row.admission_id ?? context.admissionId ?? null,
    patientId: row.patientId ?? row.patient_id ?? context.patientId ?? null,
    chargeDate: String(row.chargeDate ?? row.charge_date ?? '').slice(0, 10),
    category: String(row.category ?? row.charge_category ?? 'miscellaneous'),
    particulars: String(
      row.particulars ?? row.item_name ?? row.description ?? row.label ?? '',
    ).trim(),
    quantity,
    unit: row.unit ?? null,
    rate,
    amount,
    source,
    sourceId: row.sourceId ?? row.source_id ?? null,
    status: row.status ?? BILLING_STATUS.ACTIVE,
  };
}

export function isManualBillingTransaction(transaction) {
  return transaction?.source === BILLING_SOURCE.MANUAL;
}

export function isAutomaticBillingTransaction(transaction) {
  return Boolean(transaction?.source) && !isManualBillingTransaction(transaction);
}
