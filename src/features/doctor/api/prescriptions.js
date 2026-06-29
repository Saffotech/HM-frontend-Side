/** Doctor prescriptions API — root /prescriptions paths */

import { apiClient } from '@/shared/api/client';
import { asList } from '@/shared/api/dataSource';

export async function getPrescriptionsByPatient(patientId, token) {
  const response = await apiClient(`/prescriptions/patient/${patientId}`, { token });
  return asList(response);
}

export async function getPrescriptionById(id, token) {
  return apiClient(`/prescriptions/${id}`, { token });
}

export async function createPrescription(body, token) {
  return apiClient('/prescriptions', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  });
}

export async function updatePrescription(id, body, token) {
  return apiClient(`/prescriptions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
    token,
  });
}

export async function deletePrescription(id, token) {
  return apiClient(`/prescriptions/${id}`, {
    method: 'DELETE',
    token,
  });
}
