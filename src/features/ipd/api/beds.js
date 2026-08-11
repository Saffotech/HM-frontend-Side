/**
 * IPD beds API — live backend `/ipd/beds*`.
 */

import { apiClient } from '@/shared/api/client';
import { buildQueryString } from '@/shared/utils/buildQueryString';

export async function getIpdBeds(params = {}, token) {
  const query = buildQueryString(params);
  return apiClient(`/ipd/beds${query}`, { token });
}

export async function getIpdWardStats(token) {
  return apiClient('/ipd/beds/wards', { token });
}

export async function transferIpdBed(payload, token) {
  return apiClient('/ipd/beds/transfer', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}
