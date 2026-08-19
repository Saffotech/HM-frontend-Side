/** Build insurance IPD final bill / claim statement print payload from available data. */

import { isDiscountCharge } from '@/features/ipd/utils/insuranceChargeHeads';

function formatBillDate(label) {
  if (!label) {
    return new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  return String(label);
}

function parseAgeGender(ageGender) {
  const parts = String(ageGender || '')
    .split('·')
    .map((s) => s.trim());
  const age = parts[0]?.replace(/\s*y\s*$/i, '') || null;
  const gender = parts[1] || null;
  return { age, gender };
}

function numOrNull(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function buildInsuranceIpdBillPrintModel({
  claim,
  patient,
  charges = [],
  grossBill = 0,
  useInsurance = true,
}) {
  if (!claim) return null;

  const chargeRows = charges.filter((row) => !isDiscountCharge(row));
  const discountRow = charges.find((row) => isDiscountCharge(row));
  const discount =
    numOrNull(discountRow?.amount) ?? numOrNull(claim.discount) ?? 0;

  const lineItems = chargeRows.map((row) => {
    const amount = numOrNull(row.amount) ?? 0;
    return {
      description: row.label,
      qty: 1,
      rate: amount,
      amount,
    };
  });

  const grossBeforeDiscount = lineItems.reduce((sum, row) => sum + row.amount, 0);
  const netFromCharges = Math.max(0, grossBeforeDiscount - discount);
  const netHospitalBill =
    grossBill > 0 ? Math.max(0, grossBill) : netFromCharges;

  const { age, gender } = parseAgeGender(claim.ageGender);

  const claimed = numOrNull(claim.claimed);
  const approved = numOrNull(claim.approved);

  const insOutstanding = numOrNull(claim.insOutstanding) ?? 0;
  const patientOutstanding = numOrNull(claim.patientOutstanding) ?? 0;
  const patientPaid = numOrNull(claim.patientPaid) ?? 0;
  const insReceived = numOrNull(claim.insReceived) ?? 0;

  return {
    document_title: 'IPD INSURANCE FINAL BILL / CLAIM STATEMENT',
    bill_number: claim.ipdId || null,
    bill_date: formatBillDate(claim.dischargeDate || claim.createdLabel),
    payment_mode: useInsurance
      ? claim.coverage || 'Insurance'
      : 'Self Pay',
    claim_id: claim.id || null,
    coverage: claim.coverage || null,
    patient: {
      name: claim.patientName || null,
      patient_id: claim.uhid || null,
      age,
      gender,
      age_gender: claim.ageGender || null,
      phone: patient?.phone || null,
    },
    admission: {
      ipd_id: claim.ipdId || null,
      admission_date: claim.admissionDate || null,
      discharge_date: claim.dischargeDate || null,
      doctor: claim.doctor || null,
      ward_room: claim.wardRoom || null,
    },
    insurance: useInsurance
      ? {
          company: claim.insurer || null,
          policy_no: claim.policyNo || null,
          policy_holder: claim.policyHolder || null,
          relationship: claim.relationship || null,
          claimed: claimed,
          estimate_amount: numOrNull(claim.estimateAmount),
          policy_status: claim.policyStatus || null,
        }
      : null,
    line_items: lineItems,
    gross_before_discount: grossBeforeDiscount,
    discount,
    net_hospital_bill: netHospitalBill,
    summary: {
      total_hospital_bill: netHospitalBill,
      claim_amount: claimed,
      approved_amount: approved,
      ins_received: insReceived,
      ins_outstanding: insOutstanding,
      patient_responsibility: numOrNull(claim.patientResponsibility),
      patient_paid: patientPaid,
      patient_outstanding: patientOutstanding,
      claim_status: claim.statusLabel || null,
      ins_payment_status: claim.insPaymentLabel || null,
      patient_payment_status: claim.patientPaymentLabel || null,
      patient_amount_due: patientOutstanding,
      insurance_amount_pending: insOutstanding,
      no_patient_due: patientOutstanding <= 0,
      no_insurance_pending: insOutstanding <= 0,
    },
  };
}
