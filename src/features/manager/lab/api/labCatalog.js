/**
 * Admin Lab Test Catalog API — GET/POST/PATCH /lab-catalog
 * Catalog price is current configuration only (not historical order price).
 */

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

/** GET /lab-catalog — list (optional active + department_id filters). */
export async function getAdminLabCatalog(token, params = {}) {
  return apiClient(appendQuery('/lab-catalog', params), { token });
}

/** POST /lab-catalog */
export async function createAdminLabCatalogTest(payload, token) {
  return apiClient('/lab-catalog', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

/** PATCH /lab-catalog/{test_id} — partial update (name / price / department). */
export async function updateAdminLabCatalogTest(testId, payload, token) {
  return apiClient(`/lab-catalog/${encodeURIComponent(testId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    token,
  });
}

/** PATCH /lab-catalog/{test_id}/activate — { active: true|false }. */
export async function setAdminLabCatalogActive(testId, active, token) {
  return apiClient(`/lab-catalog/${encodeURIComponent(testId)}/activate`, {
    method: 'PATCH',
    body: JSON.stringify({ active: Boolean(active) }),
    token,
  });
}
