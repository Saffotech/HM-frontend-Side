import {
  addToQueue,
  getTodayQueue,
  getCurrentQueue,
  startConsultation,
  completeConsultation,
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
  return apiToUiQueueRow(await completeConsultation(queueId, token, clinical));
}

export async function notifyNextPatient(appointmentId, token) {
  return requestNextPatient(appointmentId, token);
}
