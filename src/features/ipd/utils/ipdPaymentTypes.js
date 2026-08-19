/** IPD list filters — self vs insurance cashless vs insurance pay-and-claim. */

import {
  isCashlessAdmission,
  isPayAndClaimAdmission,
} from '@/features/ipd/utils/dummyInsuranceClaim';

export const IPD_PAYMENT_TYPE = {
  SELF: 'self',
  INSURANCE_CASHLESS: 'insurance_cashless',
  INSURANCE_PAY_AND_CLAIM: 'insurance_pay_and_claim',
};

export const IPD_PAYMENT_TYPE_OPTIONS = [
  { value: IPD_PAYMENT_TYPE.SELF, label: 'Self' },
  {
    value: IPD_PAYMENT_TYPE.INSURANCE_CASHLESS,
    label: 'Insurance / Cashless',
  },
  {
    value: IPD_PAYMENT_TYPE.INSURANCE_PAY_AND_CLAIM,
    label: 'Insurance / Pay and Claim',
  },
];

/** Parse URL/query value; legacy `insurance` → cashless. */
export function parseIpdPaymentType(raw) {
  const key = String(raw ?? '').trim();
  if (
    key === IPD_PAYMENT_TYPE.INSURANCE_CASHLESS ||
    key === 'insurance'
  ) {
    return IPD_PAYMENT_TYPE.INSURANCE_CASHLESS;
  }
  if (key === IPD_PAYMENT_TYPE.INSURANCE_PAY_AND_CLAIM) {
    return IPD_PAYMENT_TYPE.INSURANCE_PAY_AND_CLAIM;
  }
  return IPD_PAYMENT_TYPE.SELF;
}

export function isInsuranceCashlessPaymentType(type) {
  return type === IPD_PAYMENT_TYPE.INSURANCE_CASHLESS;
}

export function usesSelfBillingFlow(type) {
  return (
    type === IPD_PAYMENT_TYPE.SELF ||
    type === IPD_PAYMENT_TYPE.INSURANCE_PAY_AND_CLAIM
  );
}

export function paymentTypeQueryValue(type) {
  return type === IPD_PAYMENT_TYPE.SELF ? '' : type;
}

/**
 * Filter patients / bills by payment type.
 * - Self            → not cashless, not pay-and-claim
 * - Insurance/Cashless    → isCashlessAdmission (patient_uid key)
 * - Insurance/Pay and Claim → isPayAndClaimAdmission (admission ID key)
 */
export function matchesPaymentType(admissionId, patientUid, paymentType) {
  const payAndClaim = isPayAndClaimAdmission(admissionId);
  const cashless = isCashlessAdmission(patientUid);

  if (paymentType === IPD_PAYMENT_TYPE.INSURANCE_PAY_AND_CLAIM) {
    return payAndClaim;
  }
  if (paymentType === IPD_PAYMENT_TYPE.INSURANCE_CASHLESS) {
    return cashless;
  }
  // Self — exclude cashless and pay-and-claim admissions
  return !payAndClaim && !cashless;
}

/** @deprecated use matchesPaymentType */
export function matchesSelfBillingPaymentType(admissionId, paymentType) {
  return matchesPaymentType(admissionId, null, paymentType);
}
