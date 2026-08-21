import { saveDoctorIpdConsultation } from '@/features/doctor/api/ipd';
import { cacheIpdConsultVisit } from '@/features/doctor/utils/ipdConsultVisitCache';
import { buildIpdConsultVisitNotes } from '@/features/doctor/utils/ipdConsultNotes';

/**
 * IPD consult save — POST /doctor/ipd-admissions/{id}/consultations.
 * Caches full visit notes (incl. Rx/labs) first for visit-history merge.
 */
export async function finalizeIpdConsultationOnSave({
  admissionId,
  patientUid,
  token,
  clinical,
}) {
  if (admissionId == null) {
    throw new Error('Admission id missing — cannot save consultation');
  }

  const visitNotes = buildIpdConsultVisitNotes(clinical);
  const visitedAt = new Date().toISOString();

  cacheIpdConsultVisit({
    admissionId,
    patientUid,
    visitNotes,
    visitedAt,
  });

  const response = await saveDoctorIpdConsultation(
    admissionId,
    {
      clinical: {
        symptoms: clinical.symptoms?.trim() || undefined,
        diagnosis: clinical.diagnosis?.trim() ?? '',
        notes: clinical.notes?.trim() || undefined,
        follow_up_date: clinical.followUp || undefined,
      },
    },
    token,
  );

  return {
    visitedAt: response?.visit?.visited_at ?? visitedAt,
    visitNotes,
    response,
  };
}
