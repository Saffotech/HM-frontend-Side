/**
 * Lightweight projections for the doctor dashboard.
 * Backend responses are unchanged; select trims observer-facing data only.
 */

/** Fields required by dashboard table, stat cards, consult flow, and recent patients. */
export function toDashboardAppointment(appt) {
  if (!appt) return null;
  return {
    id: appt.id,
    dbId: appt.dbId,
    patientUid: appt.patientUid,
    patientId: appt.patientId,
    patientDbId: appt.patientDbId,
    patientName: appt.patientName,
    patientAge: appt.patientAge,
    patientGender: appt.patientGender,
    patientPhone: appt.patientPhone,
    time: appt.time,
    date: appt.date,
    scheduledAt: appt.scheduledAt,
    status: appt.status,
    type: appt.type,
    reason: appt.reason,
  };
}

export function selectDashboardAppointments(appointments) {
  if (!appointments?.length) return [];
  return appointments.map(toDashboardAppointment).filter(Boolean);
}

/** Queue fields used for token sort, consult flow, and prescribe fallback. */
export function selectDashboardQueue(queue) {
  if (!queue?.length) return [];
  return queue.map((row) => ({
    queueId: row.queueId,
    appointmentId: row.appointmentId,
    tokenNumber: row.tokenNumber ?? 0,
    status: row.status,
    patientId: row.patientId,
  }));
}
