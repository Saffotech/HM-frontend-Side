import { doctorQueueApi } from '@/shared/api/services';
import { isPendingConsultation } from '@/features/doctor/utils/appointmentWorkflow';
import {
  findQueueRowForAppointment,
  isQueueInConsultation,
  isQueueTerminal,
} from '@/features/doctor/utils/queueWorkflow';

export { isPendingConsultation };

/**
 * On explicit save only: ensure queue row exists, then complete consultation.
 * Uses existing POST /queue/add, PUT /queue/start/{id}, PUT /queue/complete/{id}.
 */
export async function finalizeConsultationOnSave({
  appointmentDbId,
  todayQueue = [],
  token,
  clinical,
}) {
  if (appointmentDbId == null) {
    throw new Error('Appointment id missing — cannot save consultation');
  }

  let queueRow = findQueueRowForAppointment(todayQueue, appointmentDbId);
  if (queueRow && isQueueTerminal(queueRow)) {
    queueRow = null;
  }

  if (!queueRow?.queueId) {
    const freshQueue = await doctorQueueApi.fetchTodayQueue(token);
    queueRow = findQueueRowForAppointment(freshQueue, appointmentDbId);
    if (queueRow && isQueueTerminal(queueRow)) {
      queueRow = null;
    }
  }

  if (!queueRow?.queueId) {
    queueRow = await doctorQueueApi.enqueueAppointment(appointmentDbId, token);
  }

  if (!queueRow?.queueId) {
    throw new Error('Could not resolve queue entry for this consultation');
  }

  if (!isQueueInConsultation(queueRow)) {
    queueRow = await doctorQueueApi.beginQueueConsultation(queueRow.queueId, token);
  }

  return doctorQueueApi.finishQueueConsultation(queueRow.queueId, token, clinical);
}
