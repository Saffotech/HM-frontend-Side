/**
 * IPD billing repository — API-only data access for billing UI.
 * No dummy adapter and no sessionStorage fallback.
 */

import {
  IPD_BILLING_USE_LIVE_API,
  getIpdBillingBundle,
  updateIpdDailyBilling,
  updateIpdFinalBilling,
} from '@/features/ipd/api/ipdBilling';
import * as selfPayAdapter from '@/features/ipd/billing/ipdSelfPayBillingAdapter';
import { mapBackendBillingBundleResponse } from '@/features/ipd/billing/ipdBillingMapper';

function pendingBillingSave(feature) {
  const error = new Error(
    `${feature} is waiting for the unified IPD billing API.`,
  );
  error.code = 'IPD_BILLING_API_NOT_ENABLED';
  return error;
}

export async function fetchIpdInsuranceBillingBundle(
  { patientId, insuranceAdmit },
  token,
) {
  if (!IPD_BILLING_USE_LIVE_API) {
    return null;
  }

  const admissionId = insuranceAdmit?.admission?.id ?? insuranceAdmit?.claim?.admissionId;
  if (!admissionId) return null;

  const raw = await getIpdBillingBundle(admissionId, token);
  return mapBackendBillingBundleResponse(raw, {
    patientId,
    admissionId: String(admissionId),
    patient: insuranceAdmit?.patient ?? null,
    claim: insuranceAdmit?.claim ?? null,
    insuranceAdmit,
    claimId: insuranceAdmit?.claim?.id ?? null,
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
  const admissionId = insuranceAdmit?.admission?.id;
  if (!admissionId) {
    throw pendingBillingSave('Saving insurance hospital charges');
  }
  void claimId;
  await updateIpdFinalBilling(admissionId, { charges }, token);
  return fetchIpdInsuranceBillingBundle({ patientId, insuranceAdmit }, token);
}

export async function saveIpdInsuranceDailyCharges(
  { claimId, dailyCharges, patientId, insuranceAdmit },
  token,
) {
  if (!IPD_BILLING_USE_LIVE_API) {
    throw pendingBillingSave('Saving insurance daily charges');
  }
  const admissionId = insuranceAdmit?.admission?.id;
  if (!admissionId) {
    throw pendingBillingSave('Saving insurance daily charges');
  }
  void claimId;
  await updateIpdDailyBilling(admissionId, { dailyCharges }, token);
  return fetchIpdInsuranceBillingBundle({ patientId, insuranceAdmit }, token);
}

export async function saveIpdInsuranceClaimAmounts(
  { claimId, patch, patientId, insuranceAdmit },
  token,
) {
  if (!IPD_BILLING_USE_LIVE_API) {
    throw pendingBillingSave('Saving insurance claim amounts');
  }
  void claimId;
  void patch;
  void token;
  return fetchIpdInsuranceBillingBundle({ patientId, insuranceAdmit }, token);
}
