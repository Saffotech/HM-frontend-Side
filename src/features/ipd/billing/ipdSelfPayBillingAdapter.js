/**
 * Self-pay / copay billing adapter — live bill-preview API only.
 * Manual charge persistence waits for the unified billing API.
 */

import { getIpdBillPreview } from '@/features/ipd/api/billing';
import { buildSelfPayBillingBundle } from '@/features/ipd/billing/ipdBillingMapper';

export async function fetchSelfPayBillingBundle(
  { admissionId, patientId, preview, admittedAt, doctorVisits },
  token,
) {
  const previewData =
    preview ?? (await getIpdBillPreview(admissionId, token));
  return buildSelfPayBillingBundle(
    previewData,
    {
      admissionId: String(admissionId),
      patientId,
      admittedAt,
      doctorVisits,
    },
    null,
  );
}
