/**
 * IPD billing API — live backend `/ipd/billing*`.
 */

import { apiClient } from '@/shared/api/client';
import { buildQueryString } from '@/shared/utils/buildQueryString';

export async function getIpdRunningBills(params = {}, token) {
  const query = buildQueryString(params);
  return apiClient(`/ipd/billing/running${query}`, { token });
}

export async function getIpdBillPreview(admissionId, token) {
  return apiClient(`/ipd/billing/preview/${admissionId}`, { token });
}

export async function generateIpdBill(payload, token) {
  return apiClient('/ipd/billing/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export async function getIpdPaymentHistory(params = {}, token) {
  const query = buildQueryString(params);
  return apiClient(`/ipd/payments/history${query}`, { token });
}

export async function payIpdBill(billId, payload, token) {
  return apiClient(`/ipd/billing/${billId}/pay`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}
