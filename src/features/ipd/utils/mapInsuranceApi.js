/**
 * Map insurance API payloads into the shapes already used by IPD insurance UI.
 * Field names accept snake_case or camelCase until the backend contract is frozen.
 */

function pick(row, ...keys) {
  for (const key of keys) {
    if (row?.[key] != null && row[key] !== '') return row[key];
  }
  return undefined;
}

export function mapInsurancePatientRow(row = {}) {
  return {
    id: pick(row, 'id', 'patient_id', 'patientId'),
    admissionId: pick(row, 'admission_id', 'admissionId') ?? null,
    claimId: pick(row, 'claim_id', 'claimId') ?? null,
    patientName: pick(row, 'patient_name', 'patientName') ?? '—',
    ageGender: pick(row, 'age_gender', 'ageGender') ?? '—',
    uhid: pick(row, 'uhid', 'patient_uid', 'patientUid') ?? '—',
    coverage: pick(row, 'coverage') ?? 'Cashless Insurance',
    insurer: pick(row, 'insurer', 'insurance_company') ?? '—',
    policyNo: pick(row, 'policy_no', 'policyNo') ?? '—',
    availableSi: pick(row, 'available_si', 'availableSi') ?? null,
    policyStatus: pick(row, 'policy_status', 'policyStatus') ?? 'Active',
  };
}

export function mapInsuranceBillRow(row = {}) {
  return {
    id: pick(row, 'id', 'claim_id', 'claimId'),
    patientId: pick(row, 'patient_id', 'patientId'),
    ipdId: pick(row, 'ipd_id', 'ipdId', 'admission_no') ?? '—',
    patientName: pick(row, 'patient_name', 'patientName') ?? '—',
    uhid: pick(row, 'uhid', 'patient_uid') ?? '—',
    ageGender: pick(row, 'age_gender', 'ageGender') ?? '—',
    admitted: pick(row, 'admitted', 'admission_date', 'admissionDate') ?? '—',
    doctor: pick(row, 'doctor', 'doctor_name') ?? '—',
    wardRoom: pick(row, 'ward_room', 'wardRoom') ?? '—',
    coverage: pick(row, 'coverage') ?? 'Cashless Insurance',
    netBill: Number(pick(row, 'net_bill', 'netBill') ?? 0),
    approved: Number(pick(row, 'approved', 'approved_amount') ?? 0),
    claimLabel: pick(row, 'claim_label', 'claimLabel', 'status_label') ?? '—',
  };
}

export function mapInsuranceClaim(row = {}) {
  return {
    ...row,
    id: pick(row, 'id', 'claim_id', 'claimId'),
    patientId: pick(row, 'patient_id', 'patientId') ?? null,
  };
}

export function paymentTypeFromRecord(record) {
  const raw = String(
    record?.payment_type ??
      record?.paymentType ??
      record?.coverage_type ??
      record?.claim_type ??
      '',
  )
    .trim()
    .toLowerCase();

  if (
    raw.includes('cashless') ||
    raw === 'insurance_cashless' ||
    raw === 'insurance'
  ) {
    return 'insurance_cashless';
  }
  if (
    raw.includes('copay') ||
    raw.includes('co-pay') ||
    raw.includes('pay_and_claim') ||
    raw.includes('pay-and-claim') ||
    raw === 'insurance_copay'
  ) {
    return 'insurance_copay';
  }
  if (raw === 'self' || raw === 'self_pay' || raw === 'self-pay') {
    return 'self';
  }
  return null;
}
