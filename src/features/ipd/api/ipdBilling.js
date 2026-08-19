/**
 * IPD unified billing API — endpoint stubs for future backend integration.
 *
 * Set IPD_BILLING_USE_LIVE_API = true once backend exposes these routes.
 * Do not invent response shapes; mappers adapt real payloads in ipdBillingMapper.js.
 */

import { apiClient } from '@/shared/api/client';

/** Flip to true when unified IPD billing endpoints are deployed. */
export const IPD_BILLING_USE_LIVE_API = false;

const IPD_BILLING_API_NOT_ENABLED = 'IPD_BILLING_API_NOT_ENABLED';

function assertLiveBillingApi() {
  if (!IPD_BILLING_USE_LIVE_API) {
    const error = new Error('IPD unified billing API is not enabled');
    error.code = IPD_BILLING_API_NOT_ENABLED;
    throw error;
  }
}

/** Future: GET /ipd/admissions/{admissionId}/billing */
export async function getIpdBillingBundle(admissionId, token) {
  assertLiveBillingApi();
  return apiClient(`/ipd/admissions/${admissionId}/billing`, { token });
}

/** Future: GET /ipd/admissions/{admissionId}/billing/daily */
export async function getIpdDailyBilling(admissionId, token) {
  assertLiveBillingApi();
  return apiClient(`/ipd/admissions/${admissionId}/billing/daily`, { token });
}

/** Future: GET /ipd/admissions/{admissionId}/billing/final */
export async function getIpdFinalBilling(admissionId, token) {
  assertLiveBillingApi();
  return apiClient(`/ipd/admissions/${admissionId}/billing/final`, { token });
}

/** Future: PUT /ipd/admissions/{admissionId}/billing/daily */
export async function updateIpdDailyBilling(admissionId, payload, token) {
  assertLiveBillingApi();
  return apiClient(`/ipd/admissions/${admissionId}/billing/daily`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
}

/** Future: PUT /ipd/admissions/{admissionId}/billing/final */
export async function updateIpdFinalBilling(admissionId, payload, token) {
  assertLiveBillingApi();
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
