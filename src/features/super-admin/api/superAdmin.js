/**
 * Super Admin API — settings and audit (live backend).
 */

import { apiClient } from '@/shared/api/client';

function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    qs.set(key, String(value));
  });
  const query = qs.toString();
  return query ? `?${query}` : '';
}

/** GET /super-admin/settings */
export async function getHospitalSettings() {
  return apiClient('/super-admin/settings');
}

/** PATCH /super-admin/settings */
export async function updateHospitalSettings(body) {
  return apiClient('/super-admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** GET /super-admin/audit */
export async function listAuditLogs(params = {}) {
  const query = buildQuery({
    search: params.search?.trim() || undefined,
    action: params.action || undefined,
    actor_id: params.actor_id,
    date_from: params.date_from || params.dateFrom || undefined,
    date_to: params.date_to || params.dateTo || undefined,
    page: params.page ?? 1,
    limit: params.limit ?? 100,
  });
  return apiClient(`/super-admin/audit${query}`);
}
