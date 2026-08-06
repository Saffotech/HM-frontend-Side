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

export async function getIpdAdmission(admissionId, token) {
  return apiClient(`/ipd/admissions/${admissionId}`, { token });
}

export async function updateIpdAdmission(admissionId, payload, token) {
  return apiClient(`/ipd/admissions/${admissionId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
}

export async function addIpdDoctorVisit(admissionId, payload, token) {
  return apiClient(`/ipd/admissions/${admissionId}/visits`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}
