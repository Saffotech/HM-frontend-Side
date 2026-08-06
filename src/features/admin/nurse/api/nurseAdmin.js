import { apiClient } from '@/shared/api/client';
import { listPermissions } from '@/features/admin/api/admin';
import {
  loadPermissionCatalog,
  savePermissionCatalog,
} from '@/features/admin/utils/permissionCatalog';
import * as nurseApi from '@/features/nurse/api/nurse';

function normalizePaged(raw) {
  if (Array.isArray(raw)) {
    return { items: raw, total: raw.length, page: 1, page_size: raw.length };
  }
  return {
    items: raw?.items ?? raw?.data ?? [],
    total: raw?.total ?? raw?.count ?? 0,
    page: raw?.page ?? 1,
    page_size: raw?.page_size ?? raw?.limit ?? 20,
  };
}

export async function listNurseAlerts(params = {}) {
  const raw = await nurseApi.getAlerts(params);
  return normalizePaged(raw);
}

export async function getNurseAlertsSummary() {
  return nurseApi.getAlertSummary({});
}

export async function listNurseVitals(params = {}) {
  const raw = await nurseApi.listVitals(params);
  return normalizePaged(raw);
}

export async function listNurseNotes(params = {}) {
  const raw = await nurseApi.listNotes(params);
  return normalizePaged(raw);
}

export async function listNurseMedicationHistory(params = {}) {
  const raw = await nurseApi.getMedicationHistory(params);
  return normalizePaged(raw);
}

export async function listRolePermissionsCatalog() {
  try {
    const rows = await listPermissions();
    const normalized = Array.isArray(rows) ? rows : [];
    savePermissionCatalog(normalized);
    return normalized;
  } catch (error) {
    const status = error?.status;
    if (status === 404 || status === 405 || status === 501 || status === 0) {
      // Backend may not expose GET /roles/permissions in some environments.
      return loadPermissionCatalog();
    }
    throw error;
  }
}

export async function resolveNurseAlert(alertId, body) {
  return nurseApi.resolveAlert(alertId, body);
}

export async function closeNurseAlert(alertId, body) {
  // TODO(api): Add dedicated close endpoint when backend exposes one.
  return apiClient(`/nurse/alerts/${alertId}/close`, {
    method: 'PUT',
    body: JSON.stringify(body ?? {}),
  });
}
