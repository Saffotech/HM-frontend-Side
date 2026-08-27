/** IPD list filters — self vs insurance cashless vs insurance copay. */

import { paymentTypeFromRecord } from '@/features/ipd/utils/mapInsuranceApi';

export const IPD_PAYMENT_TYPE = {
  SELF: 'self',
  INSURANCE_CASHLESS: 'insurance_cashless',
  INSURANCE_COPAY: 'insurance_copay',
};

/** Legacy alias — copay was previously called pay-and-claim. */
export const IPD_PAYMENT_TYPE_INSURANCE_PAY_AND_CLAIM = 'insurance_pay_and_claim';

export const IPD_PAYMENT_TYPE_GROUP = {
  SELF: 'self',
  INSURANCE: 'insurance',
};

/** Main filter dropdown options: Self, Insurance. */
export const IPD_PAYMENT_TYPE_GROUP_OPTIONS = [
  { value: IPD_PAYMENT_TYPE_GROUP.SELF, label: 'Self' },
  { value: IPD_PAYMENT_TYPE_GROUP.INSURANCE, label: 'Insurance' },
];

/** Sub-filter shown when Insurance is selected: Cashless, Copay. */
export const IPD_PAYMENT_TYPE_SUB_OPTIONS = [
  { value: IPD_PAYMENT_TYPE.INSURANCE_CASHLESS, label: 'Cashless' },
  { value: IPD_PAYMENT_TYPE.INSURANCE_COPAY, label: 'Copay' },
];

/** Parse URL/query value; legacy `insurance` and `insurance_cashless` → cashless. */
export function parseIpdPaymentType(raw) {
  const key = String(raw ?? '').trim();
  if (
    key === IPD_PAYMENT_TYPE.INSURANCE_CASHLESS ||
    key === 'insurance'
  ) {
    return IPD_PAYMENT_TYPE.INSURANCE_CASHLESS;
  }
  if (
    key === IPD_PAYMENT_TYPE.INSURANCE_COPAY ||
    key === IPD_PAYMENT_TYPE_INSURANCE_PAY_AND_CLAIM
  ) {
    return IPD_PAYMENT_TYPE.INSURANCE_COPAY;
  }
  return IPD_PAYMENT_TYPE.SELF;
}

export function isInsurancePaymentType(type) {
  return (
    type === IPD_PAYMENT_TYPE.INSURANCE_CASHLESS ||
    type === IPD_PAYMENT_TYPE.INSURANCE_COPAY
  );
}

export function isInsuranceCashlessPaymentType(type) {
  return type === IPD_PAYMENT_TYPE.INSURANCE_CASHLESS;
}

export function getPaymentTypeGroup(type) {
  return isInsurancePaymentType(type)
    ? IPD_PAYMENT_TYPE_GROUP.INSURANCE
    : IPD_PAYMENT_TYPE_GROUP.SELF;
}

export function usesSelfBillingFlow(type) {
  return (
    type === IPD_PAYMENT_TYPE.SELF ||
    type === IPD_PAYMENT_TYPE.INSURANCE_COPAY
  );
}

export function paymentTypeQueryValue(type) {
  return type === IPD_PAYMENT_TYPE.SELF ? '' : type;
}

/**
 * Filter a live admission / bill row by payment type.
 * Uses API fields when present; otherwise treats the row as self-pay.
 */
export function matchesPaymentType(record, paymentType) {
  const resolved = paymentTypeFromRecord(record) ?? IPD_PAYMENT_TYPE.SELF;
  return resolved === paymentType;
}

/** @deprecated use matchesPaymentType(record, paymentType) */
export function matchesSelfBillingPaymentType(record, paymentType) {
  return matchesPaymentType(record, paymentType);
}

/**
 * Cashless routes need a real patient key (uid / patient_id).
 * Never fall back to record.id — that is often admission id → 404.
 */
function cashlessPatientKey(record = {}) {
  const candidates = [
    record.patient_uid,
    record.patientUid,
    record.uhid,
    record.patientId,
    record.patient_id,
  ];
  for (const value of candidates) {
    if (value == null || value === '') continue;
    const key = String(value).trim();
    if (!key || key === '—') continue;
    return key;
  }
  return null;
}

/**
 * Route for IPD Billing action based on admission payment type.
 * Cashless → insurance billing; self + copay → bill preview.
 */
export function resolveIpdBillingPath(record = {}) {
  const paymentType =
    paymentTypeFromRecord(record) ?? IPD_PAYMENT_TYPE.SELF;

  if (paymentType === IPD_PAYMENT_TYPE.INSURANCE_CASHLESS) {
    const patientKey = cashlessPatientKey(record);
    if (!patientKey) return null;
    return `/ipd/billing/insurance/${encodeURIComponent(patientKey)}`;
  }

  const admissionId =
    record.admission_id ??
    record.admissionId ??
    record.id;
  if (admissionId == null || admissionId === '') return null;
  return `/ipd/billing/preview/${encodeURIComponent(String(admissionId))}`;
}

/**
 * Optional detail route: cashless opens insurance patient profile.
 */
export function resolveIpdPatientOpenPath(record = {}) {
  const paymentType =
    paymentTypeFromRecord(record) ?? IPD_PAYMENT_TYPE.SELF;

  if (paymentType === IPD_PAYMENT_TYPE.INSURANCE_CASHLESS) {
    const patientKey = cashlessPatientKey(record);
    if (!patientKey) return null;
    return `/ipd/patients/insurance/${encodeURIComponent(patientKey)}`;
  }

  const admissionId = record.admission_id ?? record.admissionId ?? record.id;
  if (admissionId == null || admissionId === '') return null;
  return `/ipd/patients/${encodeURIComponent(String(admissionId))}`;
}
