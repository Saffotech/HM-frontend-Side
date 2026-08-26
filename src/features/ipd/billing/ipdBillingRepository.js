/**
 * IPD billing repository — API-only data access for billing UI.
 */

import {
  IPD_BILLING_USE_LIVE_API,
  getIpdBillingBundle,
  updateIpdDailyBilling,
  updateIpdFinalBilling,
} from '@/features/ipd/api/ipdBilling';
import {
  getIpdInsurancePatient,
  updateIpdInsuranceClaim,
} from '@/features/ipd/api/insurance';
import * as selfPayAdapter from '@/features/ipd/billing/ipdSelfPayBillingAdapter';
import {
  mapBackendBillingBundleResponse,
  resolveAdmissionIdFromBillingContext,
} from '@/features/ipd/billing/ipdBillingMapper';
import { mapInsuranceClaim } from '@/features/ipd/utils/mapInsuranceApi';

function pendingBillingSave(feature) {
  const error = new Error(
    `${feature} is waiting for the unified IPD billing API.`,
  );
  error.code = 'IPD_BILLING_API_NOT_ENABLED';
  return error;
}

async function resolveInsuranceBillingContext(
  { patientId, insuranceAdmit },
  token,
) {
  let patient = insuranceAdmit?.patient ?? null;
  let claim = insuranceAdmit?.claim
    ? mapInsuranceClaim(insuranceAdmit.claim)
    : null;
  let admissionId =
    insuranceAdmit?.admission?.id ??
    resolveAdmissionIdFromBillingContext({
      patient,
      claim,
      insuranceAdmit,
    });

  if ((!admissionId || !claim) && patientId) {
    const raw = await getIpdInsurancePatient(patientId, token);
    if (raw?.patient) {
      patient = {
        id: raw.patient.id ?? raw.patient.uhid ?? patientId,
        admissionId: raw.patient.admission_id ?? raw.patient.admissionId ?? null,
        claimId: raw.patient.claim_id ?? raw.patient.claimId ?? null,
        patientName: raw.patient.patient_name ?? raw.patient.patientName,
        ageGender: raw.patient.age_gender ?? raw.patient.ageGender,
        phone: raw.patient.phone,
        uhid: raw.patient.uhid,
        coverage: raw.patient.coverage,
        insurer: raw.patient.insurer,
        policyNo: raw.patient.policy_no ?? raw.patient.policyNo,
        policyStatus: raw.patient.policy_status ?? raw.patient.policyStatus,
        registeredOn: raw.patient.registered_on ?? raw.patient.registeredOn,
      };
    }
    if (raw?.claim) {
      claim = mapInsuranceClaim(raw.claim);
    }
    admissionId =
      claim?.admissionId ??
      patient?.admissionId ??
      raw?.claim?.admission_id ??
      raw?.patient?.admission_id ??
      admissionId;
  }

  return {
    admissionId: admissionId != null ? String(admissionId) : null,
    patient,
    claim,
    insuranceAdmit: {
      ...(insuranceAdmit ?? {}),
      patient,
      claim,
      admission: insuranceAdmit?.admission ?? { id: admissionId },
    },
  };
}

export async function fetchIpdInsuranceBillingBundle(
  { patientId, insuranceAdmit },
  token,
) {
  if (!IPD_BILLING_USE_LIVE_API) {
    return null;
  }

  const ctx = await resolveInsuranceBillingContext(
    { patientId, insuranceAdmit },
    token,
  );
  if (!ctx.admissionId) return null;

  const raw = await getIpdBillingBundle(ctx.admissionId, token);
  return mapBackendBillingBundleResponse(raw, {
    patientId,
    admissionId: ctx.admissionId,
    patient: raw?.patient ?? ctx.patient,
    claim: raw?.claim ? mapInsuranceClaim(raw.claim) : ctx.claim,
    insuranceAdmit: ctx.insuranceAdmit,
    claimId: raw?.claim_id ?? ctx.claim?.id ?? null,
  });
}

export async function fetchIpdSelfPayBillingBundle(
  { admissionId, patientId, preview, admittedAt, doctorVisits },
  token,
) {
  if (!admissionId) return null;

  if (IPD_BILLING_USE_LIVE_API) {
    const raw = await getIpdBillingBundle(admissionId, token);
    return mapBackendBillingBundleResponse(raw, {
      admissionId: String(admissionId),
      patientId,
    });
  }

  return selfPayAdapter.fetchSelfPayBillingBundle(
    { admissionId, patientId, preview, admittedAt, doctorVisits },
    token,
  );
}

export async function saveIpdSelfPayFinalCharges(
  { admissionId, charges, previewItems, admittedAt, doctorVisits },
  token,
) {
  if (!IPD_BILLING_USE_LIVE_API) {
    throw pendingBillingSave('Saving self-pay hospital charges');
  }
  await updateIpdFinalBilling(admissionId, { charges, previewItems }, token);
  return fetchIpdSelfPayBillingBundle(
    { admissionId, preview: { items: previewItems }, admittedAt, doctorVisits },
    token,
  );
}

export async function saveIpdSelfPayDailyCharges(
  { admissionId, dailyCharges, previewItems, admittedAt, doctorVisits },
  token,
) {
  if (!IPD_BILLING_USE_LIVE_API) {
    throw pendingBillingSave('Saving self-pay daily charges');
  }
  await updateIpdDailyBilling(admissionId, { dailyCharges, previewItems }, token);
  return fetchIpdSelfPayBillingBundle(
    { admissionId, preview: { items: previewItems }, admittedAt, doctorVisits },
    token,
  );
}

export async function saveIpdInsuranceFinalCharges(
  { claimId, charges, patientId, insuranceAdmit },
  token,
) {
  if (!IPD_BILLING_USE_LIVE_API) {
    throw pendingBillingSave('Saving insurance hospital charges');
  }
  const ctx = await resolveInsuranceBillingContext(
    { patientId, insuranceAdmit },
    token,
  );
  if (!ctx.admissionId) {
    throw pendingBillingSave('Saving insurance hospital charges');
  }
  void claimId;
  await updateIpdFinalBilling(ctx.admissionId, { charges }, token);
  return fetchIpdInsuranceBillingBundle(
    { patientId, insuranceAdmit: ctx.insuranceAdmit },
    token,
  );
}

export async function saveIpdInsuranceDailyCharges(
  { claimId, dailyCharges, patientId, insuranceAdmit },
  token,
) {
  if (!IPD_BILLING_USE_LIVE_API) {
    throw pendingBillingSave('Saving insurance daily charges');
  }
  const ctx = await resolveInsuranceBillingContext(
    { patientId, insuranceAdmit },
    token,
  );
  if (!ctx.admissionId) {
    throw pendingBillingSave('Saving insurance daily charges');
  }
  void claimId;
  await updateIpdDailyBilling(ctx.admissionId, { dailyCharges }, token);
  return fetchIpdInsuranceBillingBundle(
    { patientId, insuranceAdmit: ctx.insuranceAdmit },
    token,
  );
}

export async function saveIpdInsuranceClaimAmounts(
  { claimId, patch, patientId, insuranceAdmit },
  token,
) {
  if (!IPD_BILLING_USE_LIVE_API) {
    throw pendingBillingSave('Saving insurance claim amounts');
  }
  const ctx = await resolveInsuranceBillingContext(
    { patientId, insuranceAdmit },
    token,
  );
  const id = claimId ?? ctx.claim?.id;
  if (id != null) {
    await updateIpdInsuranceClaim(id, patch, token);
  }
  return fetchIpdInsuranceBillingBundle(
    { patientId, insuranceAdmit: ctx.insuranceAdmit },
    token,
  );
}
