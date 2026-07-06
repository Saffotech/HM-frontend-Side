import {
  addToQueue,
  getTodayQueue,
  getCurrentQueue,
  startConsultation,
  completeConsultation,
  completeConsultationByAppointment,
  requestNextPatient,
} from '@/features/doctor/api/queue';
import { apiToUiQueueRow, mapQueueList } from '@/shared/api/mappers/queueMapper';

export async function enqueueAppointment(appointmentId, token) {
  const row = await addToQueue(appointmentId, token);
  return apiToUiQueueRow(row);
}

export async function fetchTodayQueue(token) {
  return mapQueueList(await getTodayQueue(token));
}

export async function fetchCurrentQueue(token) {
  return apiToUiQueueRow(await getCurrentQueue(token));
}

export async function beginQueueConsultation(queueId, token) {
  return apiToUiQueueRow(await startConsultation(queueId, token));
}

export async function finishQueueConsultation(queueId, token, clinical = null) {
  const response = await completeConsultation(queueId, token, clinical);
  return apiToUiQueueRow(response?.queue ?? response);
}

export async function finishConsultationByAppointment(appointmentId, token, clinical = null) {
  const response = await completeConsultationByAppointment(appointmentId, token, clinical);
  return {
    appointment: response?.appointment ?? null,
    queue: apiToUiQueueRow(response?.queue),
  };
}

export async function notifyNextPatient(appointmentId, token) {
  return requestNextPatient(appointmentId, token);
}
