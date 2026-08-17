/**
 * Doctor module patient list / visit history (not OPD demographics).
 */

import { apiStatusToUiStatus } from '@/shared/api/mappers/appointmentMapper';
import { formatVisitDateTime } from '@/features/doctor/utils/patientHistory';
import { parseEmbeddedClinicalNotes } from '@/features/doctor/utils/clinicalNotesParse';
import {
  isIpdEncounter,
  resolveNumericAppointmentDbId,
} from '@/features/doctor/utils/encounterType';

const GENDER_LABELS = {
  1: 'Male',
  2: 'Female',
  3: 'Other',
  4: 'Prefer not to say',
};

function normalizeGender(raw) {
  if (raw == null || raw === '') return '—';
  if (typeof raw === 'number') return GENDER_LABELS[raw] ?? '—';
  const key = Number(raw);
  if (!Number.isNaN(key) && GENDER_LABELS[key]) return GENDER_LABELS[key];
  return String(raw);
}

function visitRowKey(api) {
  const uhid =
    api.patient_uid ?? api.patient_uhid ?? api.patientUhid ?? api.patientUid;
  const at = api.scheduled_at ?? api.scheduledAt;
  if (api.visit_id != null) return String(api.visit_id);
  if (uhid && at) return `${uhid}-${at}`;
  return uhid ?? String(api.id ?? '');
}

function isPlaceholderReason(value) {
  return /^opd\s*walk[-\s]?in$/i.test(String(value ?? '').trim());
}

/** Prefer clinical symptoms; never surface default walk-in reason as symptoms. */
function resolveVisitSymptoms(api) {
  const clinical = api?.symptoms ?? api?.chief_complaint ?? null;
  if (clinical != null && String(clinical).trim()) return String(clinical).trim();
  const reason = api?.reason ?? null;
  if (reason != null && String(reason).trim() && !isPlaceholderReason(reason)) {
    return String(reason).trim();
  }
  return null;
}

function resolveVisitAppointmentDbId(api) {
  const enc = String(api?.encounter_type ?? api?.encounterType ?? 'OPD').toUpperCase();
  if (enc === 'IPD') return null;
  return resolveNumericAppointmentDbId(api?.id ?? api?.appointment_id ?? api?.appointmentId);
}

function resolveVisitScheduledAt(api) {
  return (
    api.scheduled_at
    ?? api.scheduledAt
    ?? api.admitted_at
    ?? api.admittedAt
    ?? null
  );
}

/** Completed-visit row from GET /patients or patient_history item */
export function apiToUiPatientVisitRow(api) {
  if (!api) return null;
  const scheduledAt = resolveVisitScheduledAt(api);
  const patientUid =
    api.patient_uid ?? api.patient_uhid ?? api.patientUhid ?? api.patientUid ?? null;
  const patientId = api.patient_id ?? api.patientId ?? null;
  const encounterType = api.encounter_type ?? api.encounterType ?? 'OPD';

  return {
    id: visitRowKey(api),
    appointmentDbId: resolveVisitAppointmentDbId(api),
    patientUid,
    patientId: patientId != null ? Number(patientId) : null,
    name: api.patient_name ?? api.patientName ?? '',
    age: api.patient_age ?? api.patientAge ?? null,
    dob:
      api.date_of_birth
      ?? api.patient_date_of_birth
      ?? api.dob
      ?? api.patientDob
      ?? null,
    gender: normalizeGender(api.patient_gender ?? api.patientGender),
    phone: api.patient_phone ?? api.patientPhone ?? null,
    scheduledAt,
    visitAt: scheduledAt,
    status: apiStatusToUiStatus(api.status) ?? api.status,
    encounterType,
    registrationSource: api.registration_source ?? api.registrationSource ?? null,
    admissionId: api.admission_id ?? api.admissionId ?? null,
    bedNumber: api.bed_number ?? api.bedNumber ?? null,
    wardName: api.ward_name ?? api.wardName ?? null,
    admittedAt: api.admitted_at ?? api.admittedAt ?? null,
    dischargedAt: api.discharged_at ?? api.dischargedAt ?? null,
    symptoms: resolveVisitSymptoms(api),
    diagnosis: api.diagnosis ?? null,
    notes: api.notes ?? null,
    followUp: api.follow_up ?? api.follow_up_date ?? api.followUp ?? api.followUpDate ?? null,
  };
}

/** Today's appointment row → same shape as patient visit list */
export function appointmentToVisitRow(appt) {
  if (!appt) return null;
  const patientUid = appt.patientUid ?? appt.patientId ?? null;
  const scheduledAt = appt.scheduledAt ?? appt.admittedAt ?? null;
  return {
    id: appt.dbId != null ? `appt-${appt.dbId}` : `${patientUid}-${appt.time ?? ''}`,
    appointmentDbId: isIpdEncounter(appt) ? null : (appt.dbId ?? null),
    patientUid,
    patientId: appt.patientDbId ?? null,
    name: appt.patientName ?? '',
    age: appt.patientAge ?? null,
    dob: appt.dob ?? appt.dateOfBirth ?? appt.date_of_birth ?? null,
    gender: appt.patientGender ?? '—',
    phone: appt.patientPhone ?? null,
    scheduledAt,
    visitAt: scheduledAt,
    status: appt.status ?? null,
    encounterType: appt.encounterType ?? 'OPD',
    registrationSource: appt.registrationSource ?? null,
    admissionId: appt.admissionId ?? null,
    bedNumber: appt.bedNumber ?? null,
    wardName: appt.wardName ?? null,
    admittedAt: appt.admittedAt ?? null,
    dischargedAt: appt.dischargedAt ?? null,
    symptoms: appt.reason ?? null,
    diagnosis: null,
    notes: appt.notes ?? null,
    followUp: null,
  };
}

export function mapPatientVisitList(rows) {
  return (rows ?? []).map(apiToUiPatientVisitRow).filter(Boolean);
}

/** Summary passed into PatientHistoryProfile (from list row or resolve helper) */
export function visitRowToPatientSummary(row) {
  if (!row) return null;
  const uid = row.patientUid ?? row.id;
  return {
    id: uid,
    patientUid: uid,
    patientId: row.patientId,
    name: row.name,
    age: row.age,
    dob: row.dob ?? null,
    gender: row.gender,
    phone: row.phone || '—',
    bloodGroup: row.bloodGroup || '—',
  };
}

/** Summary from a today's appointment row (dashboard / calendar tables). */
export function appointmentToPatientSummary(appt) {
  if (!appt) return null;
  const uid = appt.patientUid ?? appt.patientId ?? null;
  const numericId = appt.patientDbId ?? appt.patient_db_id ?? null;
  return {
    id: uid,
    patientUid: uid,
    patientId: numericId != null ? Number(numericId) : null,
    name: appt.patientName ?? '',
    age: appt.patientAge ?? null,
    dob: appt.dob ?? appt.dateOfBirth ?? appt.date_of_birth ?? null,
    gender: appt.patientGender ?? '—',
    phone: appt.patientPhone ?? '—',
    bloodGroup: appt.bloodGroup ?? '—',
  };
}

/** Timeline card from patient_history item */
function formatFollowUpDisplay(value) {
  if (value == null || value === '' || value === '—') return '—';
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return String(value);
}

export function apiToUiVisitHistoryItem(api) {
  const row = apiToUiPatientVisitRow(api);
  if (!row) return null;
  const parsed = parseEmbeddedClinicalNotes(row.notes);
  const symptoms = row.symptoms || parsed.symptoms || '—';
  const followUp = formatFollowUpDisplay(row.followUp || parsed.followUp);
  const notes =
    parsed.notes ||
    (row.notes && !/^\s*symptoms\s*:/i.test(String(row.notes)) ? row.notes : null) ||
    '—';
  return {
    id: row.id,
    appointmentDbId: row.appointmentDbId,
    encounterType: row.encounterType ?? 'OPD',
    scheduledAt: row.scheduledAt,
    admittedAt: row.admittedAt ?? null,
    dischargedAt: row.dischargedAt ?? null,
    dateTime: formatVisitDateTime(null, row.admittedAt ?? row.scheduledAt),
    sortTime: (row.admittedAt ?? row.scheduledAt)
      ? new Date(row.admittedAt ?? row.scheduledAt).getTime()
      : 0,
    symptoms,
    diagnosis: row.diagnosis || '—',
    notes,
    followUp,
    status: row.status,
    medicines: [],
  };
}

export function mapVisitHistoryList(rows) {
  return (rows ?? [])
    .map(apiToUiVisitHistoryItem)
    .filter(Boolean)
    .sort((a, b) => b.sortTime - a.sortTime);
}

/** One profile option per UHID for dropdowns (from visit list rows). */
export function dedupePatientSummariesFromVisits(visits) {
  const map = new Map();
  for (const row of visits ?? []) {
    const uid = row.patientUid;
    if (!uid || map.has(uid)) continue;
    map.set(uid, visitRowToPatientSummary(row));
  }
  return [...map.values()];
}
