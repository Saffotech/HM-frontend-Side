/** Billing API — used by features/opd/billing */

import { apiClient } from '@/shared/api/client';
import { buildQueryString } from '@/shared/utils/buildQueryString';

export async function getBills(token, params = {}) {
  const query = buildQueryString({
    status: params.status,
    search: params.search,
    today_only: params.today_only,
    from_date: params.from_date,
    to_date: params.to_date,
    page: params.page,
    limit: params.limit,
  });
  return apiClient(`/opd/bills${query}`, { token });
}

export async function previewBillFees(data, token) {
  return apiClient('/opd/bill/preview', {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  });
}

export async function previewBillForRegister(data, token) {
  return apiClient('/opd/patient/preview-bill', {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  });
}

export async function getVisitInvoice(visitId, token) {
  return apiClient(`/opd/visit/${visitId}/invoice`, { token });
}

export async function createBill(data, token) {
  return apiClient('/opd/bill/generate', {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  });
}

export async function collectPayment(visitId, data, token) {
  let payload = data;
  if (payload?.payment_mode) {
    payload = { ...payload, payment_mode: payload.payment_mode.toLowerCase() };
  }
  return apiClient(`/opd/visit/${visitId}/pay`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export async function getPaymentHistory(token, params = {}) {
  const query = buildQueryString({
    search: params.search,
    payment_mode: params.payment_mode,
    page: params.page,
    limit: params.limit,
  });
  return apiClient(`/opd/payments/history${query}`, { token });
}

export async function updateBill(visitId, data, token) {
  return apiClient(`/opd/bills/${visitId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    token,
  });
}

export async function deleteBill(visitId, token) {
  return apiClient(`/opd/bills/${visitId}`, {
    method: 'DELETE',
    token,
  });
}
