/**
 * Admin OPD Settings — frontend API contract.
 *
 * Supported backend routes:
 *   GET  /admin/settings/opd
 *   PATCH /admin/settings/opd
 *
 * The service layer falls back to localStorage only when this route is
 * unavailable or the network fails.
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
