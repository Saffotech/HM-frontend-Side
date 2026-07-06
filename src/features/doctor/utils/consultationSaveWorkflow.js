import { doctorConsultationsApi } from '@/shared/api/services';

/**
 * Atomic consultation save — POST /consultations/save.
 * Replaces legacy queue add → start → complete chain.
 */
export async function finalizeConsultationOnSave({ appointmentDbId, token, clinical }) {
  if (appointmentDbId == null) {
    throw new Error('Appointment id missing — cannot save consultation');
  }

  return doctorConsultationsApi.saveConsultationAtomic(
    { appointmentId: appointmentDbId, clinical },
    token
  );
}
