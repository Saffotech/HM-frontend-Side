/** Patients with a scheduled OPD appointment should book via reschedule, not a new booking. */

function addPatientKeys(keys, patientOrAppt) {
  const uid = patientOrAppt.patientUid ?? patientOrAppt.patientId ?? patientOrAppt.id;
  const dbId = patientOrAppt.patientDbId ?? patientOrAppt.dbId ?? patientOrAppt.patient_db_id;
  if (uid != null && uid !== '') keys.uids.add(String(uid));
  if (dbId != null && dbId !== '') keys.dbIds.add(String(dbId));
}

export function buildBookedPatientKeys(appointments = []) {
  const keys = { uids: new Set(), dbIds: new Set() };
  appointments
    .filter((appt) => appt?.status === 'Scheduled')
    .forEach((appt) => addPatientKeys(keys, appt));
  return keys;
}

export function patientHasActiveBookedAppointment(patient, bookedKeys) {
  if (!patient || !bookedKeys) return false;
  const uid = patient.id ?? patient.patientUid ?? patient.patientId;
  const dbId = patient.dbId ?? patient.patientDbId;
  if (uid != null && bookedKeys.uids.has(String(uid))) return true;
  if (dbId != null && bookedKeys.dbIds.has(String(dbId))) return true;
  return false;
}

export function filterPatientsAvailableForBooking(patients = [], bookedKeys) {
  return patients.filter((p) => !patientHasActiveBookedAppointment(p, bookedKeys));
}
