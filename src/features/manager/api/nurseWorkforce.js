/** Admin Nurse Workforce API — `/admin/nurse-workforce` (dashboard, shifts, roster). */

import { apiClient } from '@/shared/api/client';

function appendQuery(path, params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

const BASE = '/admin/nurse-workforce';

export function getWorkforceDashboard(params = {}) {
  return apiClient(appendQuery(`${BASE}/dashboard`, params));
}

export function listWorkforceShifts(params = {}) {
  return apiClient(appendQuery(`${BASE}/shifts`, params));
}

export function createWorkforceShift(body) {
  return apiClient(`${BASE}/shifts`, { method: 'POST', body: JSON.stringify(body) });
}

export function updateWorkforceShift(id, body) {
  return apiClient(`${BASE}/shifts/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export function deleteWorkforceShift(id) {
  return apiClient(`${BASE}/shifts/${id}`, { method: 'DELETE' });
}

export function listWorkforceRoster(params = {}) {
  return apiClient(appendQuery(`${BASE}/roster`, params));
}

export function createWorkforceRoster(body) {
  return apiClient(`${BASE}/roster`, { method: 'POST', body: JSON.stringify(body) });
}

export function bulkCreateWorkforceRoster(body) {
  return apiClient(`${BASE}/roster/bulk`, { method: 'POST', body: JSON.stringify(body) });
}

export function deleteWorkforceRoster(id) {
  return apiClient(`${BASE}/roster/${id}`, { method: 'DELETE' });
}
