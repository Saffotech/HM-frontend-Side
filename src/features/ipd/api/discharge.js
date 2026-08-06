/**
 * IPD discharge API — live backend `/ipd/admissions/{id}/discharge`.
 */

import { apiClient } from '@/shared/api/client';

export async function getIpdDischargePreview(admissionId, token) {
  return apiClient(`/ipd/billing/preview/${admissionId}`, { token });
}

export async function completeIpdDischarge(admissionId, payload = {}, token) {
  return apiClient(`/ipd/admissions/${admissionId}/discharge`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}
