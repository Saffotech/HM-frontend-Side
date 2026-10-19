/** Lab technician API — mirrors HM-Backend Routers/lab_router.py */

import { apiClient, apiSessionRequest } from '@/shared/api/client';

function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return;
    search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export async function getLabDashboard(token) {
  return apiClient('/lab/dashboard', { token });
}

export async function getLabOrders(params, token) {
  return apiClient(`/lab/orders${buildQuery(params)}`, { token });
}

export async function getLabOrderById(orderId, token) {
  return apiClient(`/lab/orders/${orderId}`, { token });
}

export async function patchSampleCollected(orderId, body, token) {
  return apiClient(`/lab/orders/${orderId}/sample-collected`, {
    method: 'PATCH',
    body: JSON.stringify(body ?? {}),
    token,
  });
}

export async function patchProcessing(orderId, body, token) {
  return apiClient(`/lab/orders/${orderId}/processing`, {
    method: 'PATCH',
    body: JSON.stringify(body ?? {}),
    token,
  });
}

export async function postLabReport(orderId, body, token) {
  return apiClient(`/lab/orders/${orderId}/report`, {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  });
}

export async function patchCompleteOrder(orderId, token) {
  return apiClient(`/lab/orders/${orderId}/complete`, {
    method: 'PATCH',
    token,
  });
}

export async function getLabReports(params, token) {
  return apiClient(`/lab/reports${buildQuery(params)}`, { token });
}

export async function getLabReportById(reportId, token) {
  return apiClient(`/lab/reports/${reportId}`, { token });
}

/** Multipart upload — cannot use default JSON apiClient body */
export async function postLabReportFile(orderId, file, token) {
  const formData = new FormData();
  formData.append('file', file);
  return apiSessionRequest(`/lab/orders/${orderId}/upload-file`, {
    method: 'POST',
    body: formData,
    token,
    fallbackMessage: 'File upload failed',
  });
}

export async function fetchLabReportFileBlob(reportId, token) {
  return apiSessionRequest(`/lab/reports/${reportId}/file`, {
    token,
    responseType: 'blob',
    fallbackFileName: `lab-report-${reportId}`,
    fallbackMessage: 'Could not download file',
  });
}
