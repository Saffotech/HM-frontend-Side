/**
 * Doctor module patient list / visit history (not OPD demographics).
 */

import { apiStatusToUiStatus } from '@/shared/api/mappers/appointmentMapper';
import { formatVisitDateTime } from '@/features/doctor/utils/patientHistory';

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
  const uhid = api.patient_uhid ?? api.patientUid;
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

/** Completed-visit row from GET /patients or patient_history item */
export function apiToUiPatientVisitRow(api) {
  if (!api) return null;
  const scheduledAt = api.scheduled_at ?? api.scheduledAt ?? null;
  const patientUid = api.patient_uhid ?? api.patientUid ?? null;
  const patientId = api.patient_id ?? api.patientId ?? null;

  return {
    id: visitRowKey(api),
    appointmentDbId: api.id ?? api.appointment_id ?? api.appointmentId ?? null,
    patientUid,
    patientId: patientId != null ? Number(patientId) : null,
    name: api.patient_name ?? api.patientName ?? '',
    age: api.patient_age ?? api.patientAge ?? null,
    gender: normalizeGender(api.patient_gender ?? api.patientGender),
    phone: api.patient_phone ?? api.patientPhone ?? null,
    scheduledAt,
    visitAt: scheduledAt,
    status: apiStatusToUiStatus(api.status) ?? api.status,
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
  const scheduledAt = appt.scheduledAt ?? null;
  return {
    id: appt.dbId != null ? `appt-${appt.dbId}` : `${patientUid}-${appt.time ?? ''}`,
    appointmentDbId: appt.dbId ?? null,
    patientUid,
    patientId: appt.patientDbId ?? null,
    name: appt.patientName ?? '',
    age: appt.patientAge ?? null,
    gender: appt.patientGender ?? '—',
    phone: appt.patientPhone ?? null,
    scheduledAt,
    visitAt: scheduledAt,
    status: appt.status ?? null,
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
  return {
    id: row.id,
    appointmentDbId: row.appointmentDbId,
    scheduledAt: row.scheduledAt,
    dateTime: formatVisitDateTime(null, row.scheduledAt),
    sortTime: row.scheduledAt ? new Date(row.scheduledAt).getTime() : 0,
    symptoms: row.symptoms || '—',
    diagnosis: row.diagnosis || '—',
    notes: row.notes || '—',
    followUp: formatFollowUpDisplay(row.followUp),
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
