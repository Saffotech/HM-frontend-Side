/** Manager nurse bed allocation API — `/admin-manager/nurse-bed-allocations`. */

import { apiClient } from '@/shared/api/client';

function appendQuery(path, params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

export function listNurseBedAllocations(params = {}) {
  return apiClient(appendQuery('/admin-manager/nurse-bed-allocations', params));
}

export function getNurseBedAllocation(allocationId) {
  return apiClient(`/admin-manager/nurse-bed-allocations/${allocationId}`);
}

export function createNurseBedAllocation(body) {
  return apiClient('/admin-manager/nurse-bed-allocations', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function bulkCreateNurseBedAllocations(body) {
  return apiClient('/admin-manager/nurse-bed-allocations/bulk', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateNurseBedAllocation(allocationId, body) {
  return apiClient(`/admin-manager/nurse-bed-allocations/${allocationId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deactivateNurseBedAllocation(allocationId) {
  return apiClient(`/admin-manager/nurse-bed-allocations/${allocationId}/deactivate`, {
    method: 'PUT',
  });
}

export function deleteNurseBedAllocation(allocationId) {
  return apiClient(`/admin-manager/nurse-bed-allocations/${allocationId}`, {
    method: 'DELETE',
  });
}
