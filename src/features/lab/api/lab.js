/** Lab technician API — mirrors HM-Backend Routers/lab_router.py */

import { API_BASE_URL, API_PREFIX } from '@/shared/constants';
import { apiClient } from '@/shared/api/client';

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

  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}${API_PREFIX}/lab/orders/${orderId}/upload-file`,
    {
      method: 'POST',
      headers,
      body: formData,
    }
  );

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof body.detail === 'string' ? body.detail : body.message;
    const err = new Error(detail || 'File upload failed');
    err.status = response.status;
    throw err;
  }
  return body;
}

export async function fetchLabReportFileBlob(reportId, token) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}${API_PREFIX}/lab/reports/${reportId}/file`,
    { headers }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = typeof body.detail === 'string' ? body.detail : 'Could not download file';
    const err = new Error(detail);
    err.status = response.status;
    throw err;
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') ?? '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const fileName = match?.[1] ?? `lab-report-${reportId}`;

  return { blob, fileName, contentType: response.headers.get('content-type') };
}
