/**
 * IPD insurance API — live backend `/ipd/insurance/*`.
 */

import { apiClient } from '@/shared/api/client';

export const IPD_INSURANCE_API_READY = true;

export const IPD_INSURANCE_API_PENDING = 'IPD_INSURANCE_API_PENDING';

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

/** List cashless insurance patients for the IPD patients table. */
export async function getIpdInsurancePatients(params = {}, token) {
  return apiClient(appendQuery('/ipd/insurance/patients', params), { token });
}

/** Insurance patient profile + current claim for /ipd/insurance/patients/:id */
export async function getIpdInsurancePatient(patientId, token) {
  return apiClient(`/ipd/insurance/patients/${encodeURIComponent(patientId)}`, {
    token,
  });
}

/** Cashless insurance bills for the IPD bills table. */
export async function getIpdInsuranceBills(params = {}, token) {
  return apiClient(appendQuery('/ipd/insurance/bills', params), { token });
}

/** Single insurance claim for claim-detail UI. */
export async function getIpdInsuranceClaim(claimId, token) {
  return apiClient(`/ipd/insurance/claims/${encodeURIComponent(claimId)}`, {
    token,
  });
}

/** Copay / pay-and-claim insurance profile on an admission. */
export async function getIpdAdmissionInsurance(admissionId, token) {
  return apiClient(`/ipd/insurance/admissions/${admissionId}`, { token });
}

export async function updateIpdInsuranceClaim(claimId, payload, token) {
  return apiClient(`/ipd/insurance/claims/${encodeURIComponent(claimId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateIpdInsurancePatient(patientId, payload, token) {
  return apiClient(`/ipd/insurance/patients/${encodeURIComponent(patientId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateIpdAdmissionInsurance(admissionId, payload, token) {
  return apiClient(`/ipd/insurance/admissions/${admissionId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
}

export async function addIpdInsurancePayment(claimId, payload, token) {
  return apiClient(
    `/ipd/insurance/claims/${encodeURIComponent(claimId)}/payments/insurance`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
    },
  );
}

export async function addIpdInsurancePatientPayment(claimId, payload, token) {
  return apiClient(
    `/ipd/insurance/claims/${encodeURIComponent(claimId)}/payments/patient`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
    },
  );
}
