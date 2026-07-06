/** Doctor consultation API — atomic save + read-only context */

import { apiClient } from '@/shared/api/client';

export async function getConsultationContext(appointmentId, token) {
  return apiClient(`/consultations/appointment/${appointmentId}`, { token });
}

export async function saveConsultation(body, token) {
  return apiClient('/consultations/save', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  });
}

export async function patchAppointmentConsultation(appointmentId, clinical, token) {
  return apiClient(`/consultations/appointment/${appointmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(clinical),
    token,
  });
}
