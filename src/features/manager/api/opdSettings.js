/**
 * Admin OPD Settings — frontend API contract.
 *
 * Supported backend routes:
 *   GET  /admin-manager/settings/opd
 *   PATCH /admin-manager/settings/opd
 *
 * The service layer falls back to localStorage only when this route is
 * unavailable or the network fails.
 */

import { apiClient } from '@/shared/api/client';

/** GET /admin-manager/settings/opd */
export async function getOpdSettings() {
  return apiClient('/admin-manager/settings/opd');
}

/** PATCH /admin-manager/settings/opd */
export async function updateOpdSettings(body) {
  return apiClient('/admin-manager/settings/opd', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
