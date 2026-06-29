/** Doctor consultation queue API — separate from OPD billing queue */

import { apiClient } from '@/shared/api/client';
import {
  normalizeDoctorList,
  unwrapDoctorResponse,
} from '@/shared/api/utils/doctorResponseUtils';

function extractQueue(response) {
  return response?.queue ?? null;
}

export async function addToQueue(appointmentId, token) {
  const response = await apiClient('/queue/add', {
    method: 'POST',
    body: JSON.stringify({ appointment_id: appointmentId }),
    token,
  });
  return extractQueue(response);
}

export async function getTodayQueue(token) {
  const response = await apiClient('/queue/today', { token });
  return normalizeDoctorList(unwrapDoctorResponse(response, 'queue'));
}

export async function getCurrentQueue(token) {
  const response = await apiClient('/queue/current', { token });
  return extractQueue(response);
}

export async function startConsultation(queueId, token) {
  const response = await apiClient(`/queue/start/${queueId}`, {
    method: 'PUT',
    token,
  });
  return extractQueue(response);
}

export async function completeConsultation(queueId, token, clinical = null) {
  const response = await apiClient(`/queue/complete/${queueId}`, {
    method: 'PUT',
    body: clinical ? JSON.stringify(clinical) : undefined,
    token,
  });
  return extractQueue(response);
}

export async function requestNextPatient(appointmentId, token) {
  return apiClient('/queue/request-next', {
    method: 'POST',
    body: JSON.stringify({ appointment_id: appointmentId }),
    token,
  });
}
