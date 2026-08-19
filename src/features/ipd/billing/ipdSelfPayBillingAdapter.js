/**
 * Self-pay / pay-and-claim billing adapter — preview API + sessionStorage.
 */

import { getIpdBillPreview } from '@/features/ipd/api/billing';
import { buildSelfPayBillingBundle } from '@/features/ipd/billing/ipdBillingMapper';
import {
  loadSelfPayBillingState,
  updateSelfPayDailyCharges,
  updateSelfPayFinalCharges,
} from '@/features/ipd/billing/ipdSelfPayBillingStorage';

export async function fetchSelfPayBillingBundle(
  { admissionId, patientId, preview, admittedAt, doctorVisits },
  token,
) {
  const previewData =
    preview ?? (await getIpdBillPreview(admissionId, token));
  const stored = loadSelfPayBillingState(admissionId);
  return buildSelfPayBillingBundle(
    previewData,
    {
      admissionId: String(admissionId),
      patientId,
      admittedAt,
      doctorVisits,
    },
    stored,
  );
}

export function saveSelfPayFinalCharges(
  admissionId,
  charges,
  previewItems = [],
  admissionContext = {},
) {
  const updated = updateSelfPayFinalCharges(admissionId, charges, previewItems);
  if (!updated) return null;
  return buildSelfPayBillingBundle(
    { items: previewItems, admission_id: admissionId },
    { admissionId: String(admissionId), ...admissionContext },
    updated,
  );
}

export function saveSelfPayDailyCharges(
  admissionId,
  dailyCharges,
  previewItems = [],
  admissionContext = {},
) {
  const updated = updateSelfPayDailyCharges(
    admissionId,
    dailyCharges,
    previewItems,
    admissionContext,
  );
  if (!updated) return null;
  return buildSelfPayBillingBundle(
    { items: previewItems, admission_id: admissionId },
    { admissionId: String(admissionId), ...admissionContext },
    updated,
  );
}

export function rebuildSelfPayBillingBundle(
  admissionId,
  preview,
  patientId,
  admissionContext = {},
) {
  const stored = loadSelfPayBillingState(admissionId);
  return buildSelfPayBillingBundle(
    preview,
    {
      admissionId: String(admissionId),
      patientId,
      ...admissionContext,
    },
    stored,
  );
}
