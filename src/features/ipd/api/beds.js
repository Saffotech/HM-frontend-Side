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

export async function assignIpdBed(payload, token) {
  // Admission creates occupancy — use admit endpoint
  return apiClient('/ipd/admissions', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export async function transferIpdBed(payload, token) {
  return apiClient('/ipd/beds/transfer', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export async function releaseIpdBed(admissionId, payload = {}, token) {
  return apiClient(`/ipd/admissions/${admissionId}/discharge`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}
