/**
 * Admin OPD Settings — frontend API contract.
 *
 * Backend endpoints (expected):
 *   GET  /admin/settings/opd
 *   PATCH /admin/settings/opd
 *
 * Until the backend ships these routes, the service layer falls back to
 * localStorage so Admin can configure and persist settings in the UI.
 */

import { apiClient } from '@/shared/api/client';

/** GET /admin/settings/opd */
export async function getOpdSettings() {
  return apiClient('/admin/settings/opd');
}

/** PATCH /admin/settings/opd */
export async function updateOpdSettings(body) {
  return apiClient('/admin/settings/opd', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
