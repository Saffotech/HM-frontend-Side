/** Doctor lab test orders API — root /lab-tests paths */

import { apiClient } from '@/shared/api/client';
import { asList } from '@/shared/api/dataSource';

export async function getLabTests(token, params = {}) {
  const qs = new URLSearchParams();
  if (params.search?.trim()) qs.set('search', params.search.trim());
  if (params.skip != null) qs.set('skip', String(params.skip));
  if (params.limit != null) qs.set('limit', String(params.limit));
  const query = qs.toString();
  const path = query ? `/lab-tests?${query}` : '/lab-tests';
  const response = await apiClient(path, { token });
  return asList(response);
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
