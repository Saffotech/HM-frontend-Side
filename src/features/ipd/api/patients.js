/**
 * IPD patient / admission list API — live backend `/ipd/patients*`.
 */

import { apiClient } from '@/shared/api/client';
import { buildQueryString } from '@/shared/utils/buildQueryString';

export async function getIpdPatients(params = {}, token) {
  const query = buildQueryString(params);
  return apiClient(`/ipd/patients${query}`, { token });
}

export async function getIpdPatientDetail(admissionId, token) {
  return apiClient(`/ipd/admissions/${admissionId}`, { token });
}

/**
 * Patient Master only — POST /ipd/patients/register
 * Creates UHID + demographics. No OPD visit / bill / token.
 */
export async function registerIpdPatient(payload, token) {
  return apiClient('/ipd/patients/register', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}
