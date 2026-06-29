/** Doctor clinical API — REST contract for backend integration */

import { getAppointmentsHistory } from '@/features/doctor/api/appointments';
import { getPatientHistory } from '@/features/doctor/api/patients';
import { createPrescription } from '@/features/doctor/api/prescriptions';
import { unwrapDoctorResponse } from '@/shared/api/utils/doctorResponseUtils';

function visitToRecordRow(visit) {
  const patientUid =
    visit.patient_uhid ?? visit.patient_uid ?? visit.patientId ?? visit.patient_id;
  return {
    id: visit.id ?? `visit-${visit.appointment_uid ?? visit.appointmentUid}`,
    patient_id: patientUid,
    patientId: patientUid,
    chief_complaint: visit.reason ?? visit.chief_complaint ?? visit.symptoms ?? '',
    diagnosis: visit.diagnosis ?? '',
    notes: visit.notes ?? visit.treatment_plan ?? visit.treatmentPlan ?? '',
    follow_up: visit.follow_up ?? visit.followUp ?? '',
    created_at: visit.scheduled_at ?? visit.created_at ?? visit.visitAt ?? visit.date,
  };
}

function mergeVisitRecords(historyRows, patientRows) {
  const byKey = new Map();
  for (const row of [...historyRows, ...patientRows]) {
    const key = row?.id ?? row?.appointment_uid ?? row?.appointmentUid;
    if (key == null) continue;
    byKey.set(key, visitToRecordRow(row));
  }
  return Array.from(byKey.values());
}

function buildPrescriptionNotes(data) {
  return [
    data.chief_complaint ? `Symptoms: ${data.chief_complaint}` : '',
    data.notes || '',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function getRecords(token) {
  const historyResponse = await getAppointmentsHistory(token);
  const historyRows = unwrapDoctorResponse(historyResponse, 'appointments');

  const uhids = [
    ...new Set(
      historyRows
        .map((visit) => visit.patient_uhid ?? visit.patient_uid ?? visit.patientUid)
        .filter(Boolean)
    ),
  ];

  const patientRowSets = await Promise.all(
    uhids.map((uhid) =>
      getPatientHistory(uhid, token)
        .then((rows) => (Array.isArray(rows) ? rows : []))
        .catch(() => [])
    )
  );
  const patientRows = patientRowSets.flat();

  return mergeVisitRecords(historyRows, patientRows);
}

export async function createRecord(data, token) {
  const notes = buildPrescriptionNotes(data);
  const appointmentId = data.appointment_id ?? data.appointmentId;

  if (appointmentId != null) {
    try {
      await createPrescription(
        {
          appointment_id: appointmentId,
          diagnosis: data.diagnosis || '',
          notes,
          items: [],
        },
        token
      );
    } catch {
      // Prescription may already exist or appointment not completed — return record shape below
    }
  }

  return {
    id: `record-${Date.now()}`,
    patient_id: data.patient_id ?? data.patientId,
    chief_complaint: data.chief_complaint ?? '',
    diagnosis: data.diagnosis ?? '',
    notes: data.notes ?? notes,
    created_at: new Date().toISOString(),
  };
}

export async function patchRecord(id, data) {
  if (import.meta.env.DEV) {
    console.warn('records sync pending backend');
  }
  return { id, ...data };
}

export async function getNotifications() {
  // TODO: wire to GET /doctor/notifications when backend is ready
  return [];
}

export async function patchNotification() {
  // TODO: wire to GET /doctor/notifications when backend is ready
  return null;
}

export async function markAllNotificationsRead() {
  // TODO: wire to GET /doctor/notifications when backend is ready
  return null;
}
