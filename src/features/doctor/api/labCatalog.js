/** Lab test catalog API — GET /lab-catalog (active catalog for order selectors). */

import { apiClient } from '@/shared/api/client';

/**
 * @param {string} token
 * @param {{ active?: boolean, department_id?: number }} [params]
 */
export async function getLabCatalog(token, params = {}) {
  const qs = new URLSearchParams();
  if (params.active != null) qs.set('active', String(params.active));
  if (params.department_id != null && params.department_id !== '') {
    qs.set('department_id', String(params.department_id));
  }
  const query = qs.toString();
  return apiClient(query ? `/lab-catalog?${query}` : '/lab-catalog', { token });
}
