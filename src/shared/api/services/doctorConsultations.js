import {
  getConsultationContext,
  saveConsultation,
  patchAppointmentConsultation,
} from '@/features/doctor/api/consultations';
import { apiToUiAppointment } from '@/shared/api/mappers/appointmentMapper';
import { apiToUiQueueRow } from '@/shared/api/mappers/queueMapper';

export async function fetchConsultationContext(appointmentId, token) {
  const raw = await getConsultationContext(appointmentId, token);
  return {
    appointment: apiToUiAppointment(raw.appointment),
    queue: apiToUiQueueRow(raw.queue),
    prescriptions: raw.prescriptions ?? [],
    labOrders: raw.lab_orders ?? raw.labOrders ?? [],
  };
}

export async function saveConsultationAtomic({ appointmentId, clinical }, token) {
  const raw = await saveConsultation(
    {
      appointment_id: appointmentId,
      clinical,
    },
    token
  );

  return {
    success: raw.success ?? true,
    message: raw.message ?? 'Consultation saved',
    appointment: apiToUiAppointment(raw.appointment),
    queue: apiToUiQueueRow(raw.queue),
  };
}

export async function patchConsultationOptionalQueue(appointmentId, clinical, token) {
  const raw = await patchAppointmentConsultation(appointmentId, clinical, token);
  const appointment = raw?.appointment ?? raw;
  return apiToUiAppointment(appointment);
}
