/**
 * Admin nurse workforce — HTTP + light mapping.
 */

import * as api from '@/features/admin/api/nurseWorkforce';

export async function getWorkforceDashboard(params = {}) {
  return api.getWorkforceDashboard(params);
}

export async function listWorkforceShifts(params = {}) {
  const raw = await api.listWorkforceShifts(params);
  return { items: raw?.items ?? [], total: raw?.total ?? 0 };
}

export async function createWorkforceShift(body) {
  return api.createWorkforceShift(body);
}

export async function updateWorkforceShift(id, body) {
  return api.updateWorkforceShift(id, body);
}

export async function deleteWorkforceShift(id) {
  return api.deleteWorkforceShift(id);
}

export async function listWorkforceRoster(params = {}) {
  const raw = await api.listWorkforceRoster(params);
  return {
    items: raw?.items ?? [],
    total: raw?.total ?? 0,
    page: raw?.page ?? 1,
    page_size: raw?.page_size ?? 50,
  };
}

export async function createWorkforceRoster(body) {
  return api.createWorkforceRoster(body);
}

export async function bulkCreateWorkforceRoster(body) {
  return api.bulkCreateWorkforceRoster(body);
}

export async function deleteWorkforceRoster(id) {
  return api.deleteWorkforceRoster(id);
}
