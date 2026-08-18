/** OPD vs IPD encounter helpers — doctor module only. */

export const DOCTOR_ENCOUNTER_MODE = {
  OPD: 'opd',
  IPD: 'ipd',
};

export function isIpdEncounter(row) {
  if (!row) return false;
  const enc = String(row.encounterType ?? row.encounter_type ?? '').toUpperCase();
  if (enc === 'IPD') return true;
  const apptType = String(row.type ?? row.appointment_type ?? row.appointmentType ?? '').toLowerCase();
  if (apptType === 'ipd') return true;
  if (row.admissionId != null || row.admission_id != null) return true;
  const rawId = row.id ?? row.dbId;
  if (typeof rawId === 'string' && /^IPD-/i.test(rawId.trim())) return true;
  return false;
}

export function isOpdEncounter(row) {
  return Boolean(row) && !isIpdEncounter(row);
}

export function encounterTypeLabel(row) {
  return isIpdEncounter(row) ? 'IPD' : 'OPD';
}

/** Match row to doctor shell OPD/IPD mode (opd | ipd). */
export function matchesDoctorEncounterMode(row, mode) {
  if (!row) return false;
  if (mode === DOCTOR_ENCOUNTER_MODE.IPD) return isIpdEncounter(row);
  if (mode === DOCTOR_ENCOUNTER_MODE.OPD) return isOpdEncounter(row);
  return true;
}

/** Lab orders: prefer admission_id / appointment_id, then registration_source. */
export function labOrderMatchesEncounterMode(test, mode, patientSourceByDbId = null) {
  if (!test) return false;
  if (test.admissionId != null || test.admission_id != null) {
    return mode === DOCTOR_ENCOUNTER_MODE.IPD;
  }
  if (test.appointmentId != null || test.appointment_id != null) {
    return mode === DOCTOR_ENCOUNTER_MODE.OPD;
  }
  const source =
    test.registrationSource
    ?? (test.patientDbId != null ? patientSourceByDbId?.get(Number(test.patientDbId)) : null);
  if (source) {
    const isIpd = String(source).trim().toUpperCase() === 'IPD';
    return mode === DOCTOR_ENCOUNTER_MODE.IPD ? isIpd : !isIpd;
  }
  return matchesDoctorEncounterMode(test, mode);
}

export function resolveNumericAppointmentDbId(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const str = String(raw).trim();
  if (/^\d+$/.test(str)) return Number(str);
  return null;
}
