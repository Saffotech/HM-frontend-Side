/**
 * IPD unified billing API — live `/ipd/admissions/{id}/billing*`.
 */

import { apiClient } from '@/shared/api/client';

/** Live unified IPD billing endpoints are deployed. */
export const IPD_BILLING_USE_LIVE_API = true;

/** GET /ipd/admissions/{admissionId}/billing */
export async function getIpdBillingBundle(admissionId, token) {
  return apiClient(`/ipd/admissions/${admissionId}/billing`, { token });
}

/** GET /ipd/admissions/{admissionId}/billing/daily */
export async function getIpdDailyBilling(admissionId, token) {
  return apiClient(`/ipd/admissions/${admissionId}/billing/daily`, { token });
}

/** GET /ipd/admissions/{admissionId}/billing/final */
export async function getIpdFinalBilling(admissionId, token) {
  return apiClient(`/ipd/admissions/${admissionId}/billing/final`, { token });
}

/** PUT /ipd/admissions/{admissionId}/billing/daily */
export async function updateIpdDailyBilling(admissionId, payload, token) {
  return apiClient(`/ipd/admissions/${admissionId}/billing/daily`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
}

/** PUT /ipd/admissions/{admissionId}/billing/final */
export async function updateIpdFinalBilling(admissionId, payload, token) {
  return apiClient(`/ipd/admissions/${admissionId}/billing/final`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
}

export const ipdBillingApi = {
  getIpdBillingBundle,
  getIpdDailyBilling,
  getIpdFinalBilling,
  updateIpdDailyBilling,
  updateIpdFinalBilling,
};
