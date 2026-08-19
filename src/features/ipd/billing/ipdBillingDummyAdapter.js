/**
 * Development fallback for insurance IPD billing — wraps dummyInsuranceClaim.
 * Isolated from UI; swap for live API in ipdBillingRepository when backend is ready.
 */

import {
  resolveInsurancePatientContext,
  updateInsuranceClaim,
  updateInsuranceClaimCharges,
  updateInsuranceDailyCharges,
} from '@/features/ipd/utils/dummyInsuranceClaim';
import { buildInsuranceBillingBundle } from '@/features/ipd/billing/ipdBillingMapper';

export function fetchInsuranceBillingBundle({ patientId, insuranceAdmit }) {
  const { patient, claim } = resolveInsurancePatientContext(
    patientId,
    insuranceAdmit,
  );

  if (!patient || !claim) {
    return null;
  }

  return buildInsuranceBillingBundle({
    patient,
    claim,
    insuranceAdmit,
    dataSource: 'dummy',
  });
}

export function saveInsuranceFinalCharges(claimId, charges) {
  return updateInsuranceClaimCharges(claimId, charges);
}

export function saveInsuranceDailyCharges(claimId, dailyCharges) {
  return updateInsuranceDailyCharges(claimId, dailyCharges);
}

export function saveInsuranceClaimAmounts(claimId, patch) {
  return updateInsuranceClaim(claimId, patch);
}

export function rebuildInsuranceBillingBundle({ patientId, insuranceAdmit, claim }) {
  const resolved = resolveInsurancePatientContext(patientId, insuranceAdmit);
  return buildInsuranceBillingBundle({
    patient: resolved.patient ?? null,
    claim: claim ?? resolved.claim,
    insuranceAdmit,
    dataSource: 'dummy',
  });
}
