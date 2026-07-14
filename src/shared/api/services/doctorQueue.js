import {
  getTodayQueue,
  requestNextPatient,
} from '@/features/doctor/api/queue';
import { mapQueueList } from '@/shared/api/mappers/queueMapper';

export async function fetchTodayQueue(token) {
  return mapQueueList(await getTodayQueue(token));
}

export async function notifyNextPatient(appointmentId, token) {
  return requestNextPatient(appointmentId, token);
}
