/**
 * IPD billing repository — single data access point for billing UI.
 * Tries live API when enabled; falls back to isolated dummy adapter for insurance.
 */

import {
  IPD_BILLING_USE_LIVE_API,
  getIpdBillingBundle,
} from '@/features/ipd/api/ipdBilling';
import * as dummyAdapter from '@/features/ipd/billing/ipdBillingDummyAdapter';
import * as selfPayAdapter from '@/features/ipd/billing/ipdSelfPayBillingAdapter';
import { mapBackendBillingBundleResponse } from '@/features/ipd/billing/ipdBillingMapper';

export async function fetchIpdInsuranceBillingBundle(
  { patientId, insuranceAdmit },
  token,
) {
  if (IPD_BILLING_USE_LIVE_API) {
    const admissionId =
      insuranceAdmit?.admission?.id ??
      dummyAdapter.fetchInsuranceBillingBundle({ patientId, insuranceAdmit })
        ?.admissionId;

    if (admissionId) {
      try {
        const raw = await getIpdBillingBundle(admissionId, token);
        const fallback = dummyAdapter.fetchInsuranceBillingBundle({
          patientId,
          insuranceAdmit,
        });
        return mapBackendBillingBundleResponse(raw, {
          patientId,
          admissionId: String(admissionId),
          patient: fallback?.patient,
          claim: fallback?.claim,
          insuranceAdmit,
          claimId: fallback?.claimId,
        });
      } catch {
        // Fall through to dummy adapter while backend is unavailable.
      }
    }
  }

  return dummyAdapter.fetchInsuranceBillingBundle({ patientId, insuranceAdmit });
}

export async function fetchIpdSelfPayBillingBundle(
  { admissionId, patientId, preview, admittedAt, doctorVisits },
  token,
) {
  if (!admissionId) return null;

  if (IPD_BILLING_USE_LIVE_API) {
    try {
      const raw = await getIpdBillingBundle(admissionId, token);
      return mapBackendBillingBundleResponse(raw, {
        admissionId: String(admissionId),
        patientId,
      });
    } catch {
      // Fall through to preview + local storage.
    }
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
  if (IPD_BILLING_USE_LIVE_API) {
    void token;
  }

  const updated = selfPayAdapter.saveSelfPayFinalCharges(
    admissionId,
    charges,
    previewItems,
    { admittedAt, doctorVisits },
  );
  return updated;
}

export async function saveIpdSelfPayDailyCharges(
  { admissionId, dailyCharges, previewItems, admittedAt, doctorVisits },
  token,
) {
  if (IPD_BILLING_USE_LIVE_API) {
    void token;
  }

  return selfPayAdapter.saveSelfPayDailyCharges(
    admissionId,
    dailyCharges,
    previewItems,
    { admittedAt, doctorVisits },
  );
}

export async function rebuildIpdSelfPayBillingFromPreview(
  { admissionId, patientId, preview },
  token,
) {
  void token;
  return selfPayAdapter.rebuildSelfPayBillingBundle(
    admissionId,
    preview,
    patientId,
  );
}

export async function saveIpdInsuranceFinalCharges(
  { claimId, charges, patientId, insuranceAdmit },
  token,
) {
  if (IPD_BILLING_USE_LIVE_API) {
    // Future: PUT unified billing endpoint
    void token;
  }

  const updated = dummyAdapter.saveInsuranceFinalCharges(claimId, charges);
  if (!updated) return null;

  return dummyAdapter.rebuildInsuranceBillingBundle({
    patientId,
    insuranceAdmit,
    claim: updated,
  });
}

export async function saveIpdInsuranceDailyCharges(
  { claimId, dailyCharges, patientId, insuranceAdmit },
  token,
) {
  if (IPD_BILLING_USE_LIVE_API) {
    void token;
  }

  const updated = dummyAdapter.saveInsuranceDailyCharges(claimId, dailyCharges);
  if (!updated) return null;

  return dummyAdapter.rebuildInsuranceBillingBundle({
    patientId,
    insuranceAdmit,
    claim: updated,
  });
}

export async function saveIpdInsuranceClaimAmounts(
  { claimId, patch, patientId, insuranceAdmit },
  token,
) {
  if (IPD_BILLING_USE_LIVE_API) {
    void token;
  }

  const updated = dummyAdapter.saveInsuranceClaimAmounts(claimId, patch);
  if (!updated) return null;

  return dummyAdapter.rebuildInsuranceBillingBundle({
    patientId,
    insuranceAdmit,
    claim: updated,
  });
}
