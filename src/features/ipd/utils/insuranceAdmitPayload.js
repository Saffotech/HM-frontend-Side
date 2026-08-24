/**
 * In-memory insurance payloads for post-admit navigation.
 * Not persisted — backend insurance APIs are the source of truth.
 */

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

export function insuranceAdmitRouteId(admission) {
  return String(admission?.patient_uid || admission?.patient_id || '');
}

/** Build cashless profile + claim seed after a live admission (navigation state only). */
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
    admissionId: admission?.id ?? null,
    claimId: admission?.id != null ? `pending-${admission.id}` : null,
    patientName:
      admission.patient_name || formValues.selectedLabel?.split(' · ')[0] || '—',
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
    id: patient.claimId,
    admissionId: admission?.id ?? null,
    ipdId: admission.admission_no || String(admission.id ?? ''),
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
    policyHolder: formValues.policyHolderName,
    relationship: formValues.relationship,
    memberId: formValues.memberId,
    policyStatus: 'Active',
    coverage,
    claimed: Number(formValues.claimedAmount) || 0,
    estimateAmount: Number(formValues.estimateAmount) || null,
    charges: [],
    dailyCharges: [],
    responsibilityLines: [],
    insurancePayments: [],
    patientPayments: [],
  };

  return { routePatientId, patient, claim, admission };
}

export function buildPayAndClaimInsuranceProfile(admission, formValues) {
  return {
    admissionId: admission?.id ?? null,
    coverage: 'Copay',
    insurer: formValues.insuranceCompany,
    policyNo: formValues.policyNumber,
    memberId: formValues.memberId,
    policyHolder: formValues.policyHolderName,
    relationship: formValues.relationship,
    claimedAmount: Number(formValues.claimedAmount) || 0,
    estimateAmount: Number(formValues.estimateAmount) || null,
  };
}
