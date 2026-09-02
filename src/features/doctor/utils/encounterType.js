/** OPD vs IPD encounter helpers — doctor module only. */

export const DOCTOR_ENCOUNTER_MODE = {
  OPD: 'opd',
  IPD: 'ipd',
};

/** Normalize URL / UI values to `opd` | `ipd`. */
export function parseDoctorEncounterMode(raw) {
  const value = String(raw ?? '').trim().toLowerCase();
  return value === DOCTOR_ENCOUNTER_MODE.IPD
    ? DOCTOR_ENCOUNTER_MODE.IPD
    : DOCTOR_ENCOUNTER_MODE.OPD;
}

export function isIpdEncounter(row) {
  if (!row) return false;
  const enc = String(row.encounterType ?? row.encounter_type ?? '').toUpperCase();
  if (enc === 'IPD') return true;
  // Current encounter type overrides patient registration_source (IPD-registered patients may have OPD appointments).
  if (enc === 'OPD') return false;

  const apptType = String(row.type ?? row.appointment_type ?? row.appointmentType ?? '').toLowerCase();
  if (apptType === 'ipd') return true;
  if (row.admissionId != null || row.admission_id != null) return true;
  const rawId = row.id ?? row.dbId;
  if (typeof rawId === 'string' && /^IPD-/i.test(rawId.trim())) return true;

  const source = String(row.registrationSource ?? row.registration_source ?? '').toUpperCase();
  if (source === 'IPD') return true;
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

/** Prescriptions: admission_id → IPD; otherwise OPD. */
export function prescriptionMatchesEncounterMode(rx, mode) {
  if (!rx) return false;
  const isIpd = rx.admissionId != null || rx.admission_id != null;
  if (mode === DOCTOR_ENCOUNTER_MODE.IPD) return isIpd;
  if (mode === DOCTOR_ENCOUNTER_MODE.OPD) return !isIpd;
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
    ?? test.registration_source
    ?? (test.patientDbId != null ? patientSourceByDbId?.get(Number(test.patientDbId)) : null);
  if (source) {
    const isIpd = String(source).trim().toUpperCase() === 'IPD';
    return mode === DOCTOR_ENCOUNTER_MODE.IPD ? isIpd : !isIpd;
  }
  // Ambiguous orders: never show under the opposite mode.
  if (mode === DOCTOR_ENCOUNTER_MODE.OPD) return isOpdEncounter(test);
  if (mode === DOCTOR_ENCOUNTER_MODE.IPD) return isIpdEncounter(test);
  return true;
}

export function resolveNumericAppointmentDbId(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const str = String(raw).trim();
  if (/^\d+$/.test(str)) return Number(str);
  return null;
}
