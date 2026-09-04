/**
 * IPD admission API — live backend `/ipd/admissions*`.
 */

import { apiClient } from '@/shared/api/client';

export async function createIpdAdmission(payload, token) {
  return apiClient('/ipd/admissions', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateIpdAdmission(admissionId, payload, token) {
  return apiClient(`/ipd/admissions/${admissionId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
}

export async function addIpdCareTeamDoctor(admissionId, payload, token) {
  return apiClient(`/ipd/admissions/${admissionId}/care-team`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export async function removeIpdCareTeamDoctor(admissionId, doctorId, token) {
  return apiClient(`/ipd/admissions/${admissionId}/care-team/${doctorId}`, {
    method: 'DELETE',
    token,
  });
}
