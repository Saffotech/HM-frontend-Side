/** Dummy insurance-claim records — UI preview only until API exists. */

import {
  CLAIM_STATUS,
  getClaimStatusLabel,
} from '@/features/ipd/utils/claimStatusConstants';
import {
  calculateInsuranceChargeTotals,
  cloneDefaultChargeHeads,
  normalizeInsuranceChargeHeads,
} from '@/features/ipd/utils/insuranceChargeHeads';
import {
  sortDailyCharges,
  rollupDailyChargesToChargeHeads,
} from '@/features/ipd/utils/insuranceDailyCharges';

const CLAIM_OVERRIDE_PREFIX = 'ipd-ins-claim-override:';

function claimOverrideStorageKey(claimId) {
  return `${CLAIM_OVERRIDE_PREFIX}${claimId}`;
}

function loadClaimOverride(claimId) {
  if (!claimId) return null;
  try {
    const raw = sessionStorage.getItem(claimOverrideStorageKey(claimId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveClaimOverride(claimId, claim) {
  if (!claimId || !claim) return;
  try {
    sessionStorage.setItem(
      claimOverrideStorageKey(claimId),
      JSON.stringify(claim),
    );
  } catch {
    /* ignore quota / privacy mode */
  }
}

function findBaseClaimRecord(claimId) {
  const id = String(claimId ?? '');
  const dummy = DUMMY_INSURANCE_CLAIMS.find((row) => String(row.id) === id);
  if (dummy) return dummy;

  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i);
    if (!key?.startsWith('ipd-ins-admit-ctx:')) continue;
    try {
      const ctx = JSON.parse(sessionStorage.getItem(key));
      if (String(ctx?.claim?.id) === id) return ctx.claim;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function syncAdmitContextClaim(claimId, claim) {
  const id = String(claimId ?? '');
  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i);
    if (!key?.startsWith('ipd-ins-admit-ctx:')) continue;
    try {
      const raw = sessionStorage.getItem(key);
      const ctx = raw ? JSON.parse(raw) : null;
      if (String(ctx?.claim?.id) !== id) continue;
      sessionStorage.setItem(
        key,
        JSON.stringify({ ...ctx, claim: { ...ctx.claim, ...claim } }),
      );
    } catch {
      /* ignore */
    }
  }
}

/** Recalculate derived claim amounts (does not change payment status enums). */
export function recalculateClaimFinancials(claim, patch = {}) {
  const claimed = Number(patch.claimed ?? claim.claimed ?? 0);
  const approved = Number(patch.approved ?? claim.approved ?? 0);
  const netBill = Number(claim.netBill ?? 0);
  const lines = patch.responsibilityLines ?? claim.responsibilityLines ?? [];
  const insReceived = Number(claim.insReceived ?? 0);
  const patientPaid = Number(claim.patientPaid ?? 0);

  const notApproved = Math.max(0, claimed - approved);
  const patientResponsibility =
    lines.length > 0
      ? lines.reduce((sum, line) => sum + Number(line.amount || 0), 0)
      : Math.max(0, netBill - approved);
  const insOutstanding = Math.max(0, approved - insReceived);
  const patientOutstanding = Math.max(0, patientResponsibility - patientPaid);

  return {
    claimed,
    approved,
    notApproved,
    patientResponsibility,
    insOutstanding,
    patientOutstanding,
  };
}

export const DUMMY_INSURANCE_CLAIMS = [
  {
    id: 'CLM-2001',
    ipdId: 'IPD-1001',
    createdLabel: '02 Aug 2026',
    patientName: 'Rahul Sharma',
    uhid: 'P-1024',
    ageGender: '42y · Male',
    admissionDate: '25 Jul 2026',
    dischargeDate: '31 Jul 2026',
    doctor: 'Dr. Meera Iyer',
    wardRoom: 'Ward A / Room 204',
    insurer: 'ABC Health Insurance',
    policyNo: 'POL-784512',
    tpa: 'XYZ TPA Services',
    policyHolder: 'Rahul Sharma',
    relationship: 'Self',
    sumInsured: 500000,
    availableSi: 420000,
    validTill: '02 Mar 2027',
    memberId: 'MEM-12345',
    cardNumber: 'CARD-900100',
    policyStatus: 'Active',
    coverage: 'Cashless Insurance',
    grossBill: 85000,
    discount: 5000,
    netBill: 80000,
    claimed: 70000,
    approved: 60000,
    notApproved: 10000,
    patientResponsibility: 20000,
    patientPaid: 15000,
    patientOutstanding: 5000,
    insReceived: 50000,
    insOutstanding: 10000,
    status: 'partially_approved',
    statusLabel: 'Partially Approved',
    insPaymentStatus: 'partially_received',
    insPaymentLabel: 'Partially Received',
    patientPaymentStatus: 'partially_paid',
    patientPaymentLabel: 'Partially Paid',
    charges: [
      { id: 'room', label: 'Room Charges', amount: 35000 },
      { id: 'doctor', label: 'Doctor Charges', amount: 12000 },
      { id: 'lab', label: 'Laboratory', amount: 0 },
      { id: 'pharmacy', label: 'Pharmacy', amount: 8000 },
      { id: 'procedure', label: 'Treatment', amount: 25000 },
      { id: 'misc', label: 'Miscellaneous', amount: 0 },
      { id: 'discount', label: 'Discount', amount: 5000 },
    ],
    dailyCharges: [
      {
        id: 'dc-1',
        charge_date: '2026-07-25',
        head: 'Room Charges',
        item_name: 'Room 204',
        quantity: 1,
        amount: 6000,
      },
      {
        id: 'dc-2',
        charge_date: '2026-07-25',
        head: 'Doctor Charges',
        item_name: 'Dr. Meera Iyer — admission round',
        quantity: 1,
        amount: 2000,
      },
      {
        id: 'dc-3',
        charge_date: '2026-07-26',
        head: 'Room Charges',
        item_name: 'Room 204',
        quantity: 1,
        amount: 6000,
      },
      {
        id: 'dc-4',
        charge_date: '2026-07-26',
        head: 'Pharmacy',
        item_name: 'IV Normal Saline 500ml',
        quantity: 2,
        amount: 1200,
      },
      {
        id: 'dc-5',
        charge_date: '2026-07-26',
        head: 'Pharmacy',
        item_name: 'Ceftriaxone 1g injection',
        quantity: 3,
        amount: 2300,
      },
      {
        id: 'dc-6',
        charge_date: '2026-07-27',
        head: 'Room Charges',
        item_name: 'Room 204',
        quantity: 1,
        amount: 6000,
      },
      {
        id: 'dc-7',
        charge_date: '2026-07-27',
        head: 'Treatment',
        item_name: 'Wound suturing',
        quantity: 1,
        amount: 12000,
      },
      {
        id: 'dc-8',
        charge_date: '2026-07-28',
        head: 'Room Charges',
        item_name: 'Room 204',
        quantity: 1,
        amount: 6000,
      },
      {
        id: 'dc-9',
        charge_date: '2026-07-28',
        head: 'Doctor Charges',
        item_name: 'Dr. Meera Iyer — consultation',
        quantity: 1,
        amount: 2500,
      },
      {
        id: 'dc-10',
        charge_date: '2026-07-29',
        head: 'Room Charges',
        item_name: 'Room 204',
        quantity: 1,
        amount: 5500,
      },
      {
        id: 'dc-11',
        charge_date: '2026-07-29',
        head: 'Pharmacy',
        item_name: 'Paracetamol 500mg',
        quantity: 20,
        amount: 400,
      },
      {
        id: 'dc-12',
        charge_date: '2026-07-29',
        head: 'Pharmacy',
        item_name: 'Amoxicillin 500mg',
        quantity: 15,
        amount: 900,
      },
      {
        id: 'dc-13',
        charge_date: '2026-07-29',
        head: 'Pharmacy',
        item_name: 'Pantoprazole 40mg',
        quantity: 10,
        amount: 600,
      },
      {
        id: 'dc-14',
        charge_date: '2026-07-29',
        head: 'Pharmacy',
        item_name: 'Vitamin B complex',
        quantity: 10,
        amount: 500,
      },
      {
        id: 'dc-15',
        charge_date: '2026-07-29',
        head: 'Pharmacy',
        item_name: 'ORS sachets',
        quantity: 6,
        amount: 2100,
      },
      {
        id: 'dc-16',
        charge_date: '2026-07-30',
        head: 'Room Charges',
        item_name: 'Room 204',
        quantity: 1,
        amount: 5500,
      },
      {
        id: 'dc-17',
        charge_date: '2026-07-30',
        head: 'Treatment',
        item_name: 'Wound dressing',
        quantity: 2,
        amount: 6000,
      },
      {
        id: 'dc-18',
        charge_date: '2026-07-30',
        head: 'Treatment',
        item_name: 'Nursing care',
        quantity: 1,
        amount: 7000,
      },
      {
        id: 'dc-19',
        charge_date: '2026-07-31',
        head: 'Doctor Charges',
        item_name: 'Dr. Meera Iyer — discharge review',
        quantity: 1,
        amount: 7500,
      },
    ],
    responsibilityLines: [
      { id: 'r1', reason: 'Copay', amount: 5000 },
      { id: 'r2', reason: 'Non-covered medicines', amount: 3000 },
      { id: 'r3', reason: 'Room-rent difference', amount: 2000 },
      { id: 'r4', reason: 'Other', amount: 10000 },
    ],
    insurancePayments: [
      {
        id: 'CLM-2001-IP0',
        date: '06 Aug 2026, 05:14 pm',
        mode: 'NEFT',
        reference: 'NEFT540000',
        amount: 30000,
      },
      {
        id: 'CLM-2001-IP1',
        date: '07 Aug 2026, 05:14 pm',
        mode: 'NEFT',
        reference: 'NEFT540001',
        amount: 20000,
      },
    ],
    patientPayments: [
      {
        id: 'CLM-2001-PP0',
        date: '07 Aug 2026, 05:14 pm',
        mode: 'Cash',
        reference: '—',
        amount: 15000,
      },
    ],
  },
];

/** Patients list — Insurance payment-type table (UI preview). */
export const DUMMY_INSURANCE_PATIENTS = [
  {
    id: 'ins-p-1024',
    claimId: 'CLM-2001',
    patientName: 'Rahul Sharma',
    ageGender: '42y · Male',
    phone: '9820011223',
    uhid: 'P-1024',
    coverage: 'Cashless Insurance',
    insurer: 'ABC Health Insurance',
    policyNo: 'POL-784512',
    availableSi: 420000,
    policyStatus: 'Active',
    registeredOn: '15 Jun 2026',
  },
];

export function getInsuranceClaim(claimId) {
  const base = findBaseClaimRecord(claimId);
  if (!base) return null;
  const override = loadClaimOverride(claimId);
  if (!override) return { ...base };
  return { ...base, ...override };
}

export function getAllInsuranceClaims() {
  const seen = new Set();
  const claims = [];

  DUMMY_INSURANCE_CLAIMS.forEach((row) => {
    seen.add(String(row.id));
    claims.push(getInsuranceClaim(row.id));
  });

  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i);
    if (!key?.startsWith('ipd-ins-admit-ctx:')) continue;
    try {
      const ctx = JSON.parse(sessionStorage.getItem(key));
      const id = String(ctx?.claim?.id ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      claims.push(getInsuranceClaim(id));
    } catch {
      /* ignore */
    }
  }

  return claims.filter(Boolean);
}

export function updateInsuranceClaim(claimId, patch) {
  const current = getInsuranceClaim(claimId);
  if (!current) return null;

  const financials = recalculateClaimFinancials(current, patch);
  const next = {
    ...current,
    ...patch,
    ...financials,
  };

  if (patch.status) {
    next.statusLabel = getClaimStatusLabel(patch.status);
  }

  const idx = DUMMY_INSURANCE_CLAIMS.findIndex(
    (row) => String(row.id) === String(claimId),
  );
  if (idx >= 0) {
    Object.assign(DUMMY_INSURANCE_CLAIMS[idx], next);
  }

  syncAdmitContextClaim(claimId, next);
  saveClaimOverride(claimId, next);
  return next;
}

/** Persist insurance billing charge breakdown (backend-ready payload). */
export function updateInsuranceClaimCharges(claimId, charges) {
  const normalized = normalizeInsuranceChargeHeads(charges);
  const totals = calculateInsuranceChargeTotals(normalized);
  return updateInsuranceClaim(claimId, {
    charges: normalized,
    grossBill: totals.grossBeforeDiscount,
    discount: totals.discount,
    netBill: totals.netBill,
  });
}

/** Persist date-wise charge lines and roll totals into hospital charge heads. */
export function updateInsuranceDailyCharges(claimId, dailyCharges) {
  const current = getInsuranceClaim(claimId);
  if (!current) return null;

  const normalized = sortDailyCharges(dailyCharges);
  const charges = rollupDailyChargesToChargeHeads(
    normalized,
    current.charges ?? cloneDefaultChargeHeads(),
  );
  const totals = calculateInsuranceChargeTotals(charges);

  return updateInsuranceClaim(claimId, {
    dailyCharges: normalized,
    charges: normalizeInsuranceChargeHeads(charges),
    grossBill: totals.grossBeforeDiscount,
    discount: totals.discount,
    netBill: totals.netBill,
  });
}

export function getDummyInsurancePatient(patientId) {
  const key = String(patientId ?? '');
  return DUMMY_INSURANCE_PATIENTS.find(
    (row) => String(row.id) === key || String(row.uhid) === key,
  );
}

const DEFAULT_INSURANCE_CHARGES = cloneDefaultChargeHeads();

function formatInsuranceDateLabel(raw) {
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function insuranceAdmitStorageKey(routePatientId) {
  return `ipd-ins-admit-ctx:${routePatientId}`;
}

/** Route param for insurance profile after live admission. */
export function insuranceAdmitRouteId(admission) {
  return String(admission?.patient_uid || admission?.patient_id || '');
}

export function persistInsuranceAdmitContext(routePatientId, context) {
  if (!routePatientId || !context) return;
  try {
    sessionStorage.setItem(
      insuranceAdmitStorageKey(routePatientId),
      JSON.stringify(context),
    );
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function loadInsuranceAdmitContext(routePatientId) {
  if (!routePatientId) return null;
  try {
    const raw = sessionStorage.getItem(insuranceAdmitStorageKey(routePatientId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Build profile + claim seed from a successful insurance admission (UI preview). */
export function buildInsuranceAdmitContext(admission, formValues) {
  const routePatientId = insuranceAdmitRouteId(admission);
  const coverage =
    formValues.insuranceClaimType === 'cashless'
      ? 'Cashless Insurance'
      : 'Copay';
  const createdLabel = formatInsuranceDateLabel(new Date().toISOString());
  const admissionDate = formatInsuranceDateLabel(
    admission.admitted_at || formValues.admissionDate,
  );
  const wardRoom = [admission.ward_name, admission.bed_number]
    .filter(Boolean)
    .join(' / ');

  const patient = {
    id: routePatientId,
    claimId: `NEW-${admission.id}`,
    patientName: admission.patient_name || formValues.selectedLabel?.split(' · ')[0] || '—',
    ageGender: '—',
    phone: '—',
    uhid: admission.patient_uid || routePatientId,
    coverage,
    insurer: formValues.insuranceCompany,
    policyNo: formValues.policyNumber,
    availableSi: null,
    policyStatus: 'Active',
    registeredOn: createdLabel,
  };

  const claim = {
    id: `NEW-${admission.id}`,
    ipdId: admission.admission_no || String(admission.id),
    createdLabel,
    patientName: patient.patientName,
    uhid: patient.uhid,
    ageGender: patient.ageGender,
    admissionDate,
    dischargeDate: '—',
    doctor: admission.doctor_name || '—',
    wardRoom: wardRoom || '—',
    insurer: formValues.insuranceCompany,
    policyNo: formValues.policyNumber,
    tpa: '',
    policyHolder: formValues.policyHolderName,
    relationship: formValues.relationship,
    sumInsured: null,
    availableSi: null,
    validTill: '',
    memberId: formValues.memberId,
    cardNumber: '',
    policyStatus: 'Active',
    coverage,
    grossBill: 0,
    discount: 0,
    netBill: 0,
    claimed: Number(formValues.claimedAmount) || 0,
    estimateAmount: Number(formValues.estimateAmount) || null,
    approved: 0,
    notApproved: 0,
    patientResponsibility: 0,
    patientPaid: 0,
    patientOutstanding: 0,
    insReceived: 0,
    insOutstanding: 0,
    status: CLAIM_STATUS.SUBMITTED,
    statusLabel: getClaimStatusLabel(CLAIM_STATUS.SUBMITTED),
    insPaymentStatus: 'pending',
    insPaymentLabel: 'Pending',
    patientPaymentStatus: 'pending',
    patientPaymentLabel: 'Pending',
    charges: DEFAULT_INSURANCE_CHARGES.map((row) => ({ ...row })),
    dailyCharges: [],
    responsibilityLines: [],
    insurancePayments: [],
    patientPayments: [],
  };

  return { routePatientId, patient, claim };
}

/** Resolve insurance patient + claim for profile/billing routes. */
export function resolveInsurancePatientContext(patientId, admitState) {
  const key = String(patientId ?? '');

  const dummyPatient = getDummyInsurancePatient(key);
  if (dummyPatient) {
    const claim = getInsuranceClaim(dummyPatient.claimId);
    if (claim) return { patient: dummyPatient, claim };
  }

  const admitContext =
    admitState?.routePatientId === key
      ? admitState
      : loadInsuranceAdmitContext(key);

  if (admitContext?.patient && admitContext?.claim) {
    const override = getInsuranceClaim(admitContext.claim.id);
    return {
      patient: admitContext.patient,
      claim: override ? { ...admitContext.claim, ...override } : admitContext.claim,
    };
  }

  return { patient: null, claim: null };
}

export function getDummyInsurancePatientByClaimId(claimId) {
  return DUMMY_INSURANCE_PATIENTS.find(
    (row) => String(row.claimId) === String(claimId),
  );
}

/** Bills list — Insurance payment-type table (UI preview). */
export function getDummyInsuranceBills({ cashlessOnly = false } = {}) {
  return getAllInsuranceClaims()
    .filter((claim) => {
      if (!cashlessOnly) return true;
      return String(claim.coverage ?? '')
        .toLowerCase()
        .includes('cashless');
    })
    .map((claim) => {
    const patient = DUMMY_INSURANCE_PATIENTS.find(
      (row) => row.claimId === claim.id,
    );
    return {
      id: claim.id,
      patientId: patient?.id,
      ipdId: claim.ipdId,
      patientName: claim.patientName,
      uhid: claim.uhid,
      ageGender: claim.ageGender,
      admitted: claim.admissionDate,
      doctor: claim.doctor,
      wardRoom: claim.wardRoom,
      coverage: claim.coverage,
      netBill: claim.netBill,
      approved: claim.approved,
      claimLabel: claim.statusLabel,
    };
  });
}

export function getCashlessInsurancePatients() {
  return DUMMY_INSURANCE_PATIENTS.filter((row) =>
    String(row.coverage ?? '').toLowerCase().includes('cashless'),
  );
}

function claimIdToAdmissionId(claimId) {
  const id = String(claimId ?? '');
  if (!id.startsWith('NEW-')) return null;
  const admissionId = id.slice(4);
  return admissionId || null;
}

/** Cashless list — live admissions first, then UI preview dummy rows. */
export function buildCashlessPatientRows(apiPatients = []) {
  const rows = [];
  const seen = new Set();

  const pushRow = (row) => {
    const keys = [row.uhid, row.id].filter(Boolean).map(String);
    if (keys.some((key) => seen.has(key))) return;
    keys.forEach((key) => seen.add(key));
    rows.push(row);
  };

  apiPatients.forEach((admission) => {
    const uid = admission.patient_uid;
    if (!uid || !isCashlessAdmission(uid)) return;

    const ctx = loadInsuranceAdmitContext(uid);
    const patient = ctx?.patient ?? {};

    pushRow({
      id: patient.id || uid,
      admissionId: admission.id,
      claimId: patient.claimId || ctx?.claim?.id || null,
      patientName: admission.patient_name || patient.patientName || '—',
      ageGender: patient.ageGender || '—',
      uhid: uid,
      coverage: patient.coverage || 'Cashless Insurance',
      insurer: patient.insurer || '—',
      policyNo: patient.policyNo || '—',
      availableSi: patient.availableSi ?? null,
      policyStatus: patient.policyStatus || 'Active',
    });
  });

  try {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (!key?.startsWith('ipd-ins-admit-ctx:')) continue;
      const routeId = key.slice('ipd-ins-admit-ctx:'.length);
      if (seen.has(routeId)) continue;

      const ctx = loadInsuranceAdmitContext(routeId);
      const patient = ctx?.patient;
      if (!patient) continue;
      if (!String(patient.coverage ?? '').toLowerCase().includes('cashless')) {
        continue;
      }

      pushRow({
        ...patient,
        admissionId: claimIdToAdmissionId(ctx.claim?.id),
      });
    }
  } catch {
    /* ignore */
  }

  getCashlessInsurancePatients().forEach((row) => {
    pushRow({ ...row, admissionId: row.admissionId ?? null });
  });

  return rows;
}

const PAY_AND_CLAIM_INS_PREFIX = 'ipd-pay-claim-ins:';

function payAndClaimStorageKey(admissionId) {
  return `${PAY_AND_CLAIM_INS_PREFIX}${admissionId}`;
}

/** Pay-and-claim: insurance metadata only — billing follows self-pay flow. */
export function buildPayAndClaimInsuranceProfile(admission, formValues) {
  return {
    admissionId: admission?.id,
    claimType: 'pay_and_claim',
    coverage: 'Copay',
    insurer: formValues.insuranceCompany,
    policyNo: formValues.policyNumber,
    memberId: formValues.memberId,
    policyHolder: formValues.policyHolderName,
    relationship: formValues.relationship,
    tpa: '',
    sumInsured: null,
    availableSi: null,
    validTill: '',
    cardNumber: '',
    policyStatus: 'Active',
    claimedAmount: Number(formValues.claimedAmount) || 0,
    estimateAmount: Number(formValues.estimateAmount) || null,
  };
}

export function persistPayAndClaimInsuranceContext(admissionId, profile) {
  if (!admissionId || !profile) return;
  try {
    sessionStorage.setItem(
      payAndClaimStorageKey(admissionId),
      JSON.stringify(profile),
    );
  } catch {
    /* ignore */
  }
}

export function loadPayAndClaimInsuranceContext(admissionId) {
  if (!admissionId) return null;
  try {
    const raw = sessionStorage.getItem(payAndClaimStorageKey(admissionId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isPayAndClaimAdmission(admissionId) {
  return Boolean(loadPayAndClaimInsuranceContext(admissionId));
}

export function isCashlessAdmission(patientUid) {
  if (!patientUid) return false;
  try {
    return Boolean(
      sessionStorage.getItem(`ipd-ins-admit-ctx:${patientUid}`),
    );
  } catch {
    return false;
  }
}

export function updatePayAndClaimInsuranceContext(admissionId, patch) {
  const current = loadPayAndClaimInsuranceContext(admissionId);
  if (!current) return null;
  const next = { ...current, ...patch };
  persistPayAndClaimInsuranceContext(admissionId, next);
  return next;
}
