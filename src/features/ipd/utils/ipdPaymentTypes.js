/** IPD list filters — self vs insurance cashless vs insurance copay. */

import {
  isCashlessAdmission,
  isPayAndClaimAdmission,
} from '@/features/ipd/utils/dummyInsuranceClaim';

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
 * Filter patients / bills by payment type.
 * - Self            → not cashless, not copay/pay-and-claim
 * - Insurance/Cashless    → isCashlessAdmission (patient_uid key)
 * - Insurance/Copay → isPayAndClaimAdmission (admission ID key)
 */
export function matchesPaymentType(admissionId, patientUid, paymentType) {
  const copay = isPayAndClaimAdmission(admissionId);
  const cashless = isCashlessAdmission(patientUid);

  if (paymentType === IPD_PAYMENT_TYPE.INSURANCE_COPAY) {
    return copay;
  }
  if (paymentType === IPD_PAYMENT_TYPE.INSURANCE_CASHLESS) {
    return cashless;
  }
  // Self — exclude cashless and copay admissions
  return !copay && !cashless;
}

/** @deprecated use matchesPaymentType */
export function matchesSelfBillingPaymentType(admissionId, paymentType) {
  return matchesPaymentType(admissionId, null, paymentType);
}
