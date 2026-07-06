/** Doctor lab test orders API — root /lab-tests paths */

import { API_BASE_URL, API_PREFIX } from '@/shared/constants';
import { apiClient } from '@/shared/api/client';

export async function getLabTests(token, params = {}) {
  const qs = new URLSearchParams();
  if (params.search?.trim()) qs.set('search', params.search.trim());
  if (params.status) qs.set('status', params.status);
  if (params.patient_id != null) qs.set('patient_id', String(params.patient_id));
  if (params.patient_uid) qs.set('patient_uid', params.patient_uid);
  const page = params.page ?? 1;
  const pageSize = params.page_size ?? params.limit ?? 100;
  qs.set('page', String(page));
  qs.set('page_size', String(pageSize));
  const query = qs.toString();
  const path = query ? `/lab-tests?${query}` : '/lab-tests';
  const response = await apiClient(path, { token });
  return response;
}

export async function createLabTest(body, token) {
  return apiClient('/lab-tests', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  });
}

export async function updateLabTest(testId, body, token) {
  return apiClient(`/lab-tests/${testId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
    token,
  });
}

export async function cancelLabTest(testId, token) {
  return apiClient(`/lab-tests/${testId}/cancel`, {
    method: 'PATCH',
    token,
  });
}

export async function getLabTestReport(testId, token) {
  return apiClient(`/lab-tests/${testId}/report`, { token });
}

/** Download uploaded report file (image/PDF) for doctor view */
export async function fetchLabTestReportFileBlob(testId, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(
    `${API_BASE_URL}${API_PREFIX}/lab-tests/${testId}/report/file`,
    { headers },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = typeof body.detail === 'string' ? body.detail : 'Could not load report file';
    const err = new Error(detail);
    err.status = response.status;
    throw err;
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') ?? '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const fileName = match?.[1] ?? `lab-report-${testId}`;
  const contentType = response.headers.get('content-type') ?? blob.type ?? '';

  return { blob, fileName, contentType };
}
