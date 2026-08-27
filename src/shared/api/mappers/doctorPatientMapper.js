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
    admissionId: row.admissionId ?? null,
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

/** Map a single doctor patient visit row (NurseDoctorVisitResponse shape). */
export function mapDoctorPatientVisitItem(row) {
  if (!row) return null;
  return {
    id: row.id ?? row.visit_id,
    patient_id: row.patient_id,
    patient_uid: row.patient_uid ?? null,
    patient_name: row.patient_name ?? '',
    doctor_id: row.doctor_id,
    doctor_name: row.doctor_name ?? '',
    department_name: row.department_name ?? row.department ?? null,
    department: row.department ?? row.department_name ?? null,
    specialization: row.specialization ?? null,
    visited_at: row.visited_at ?? null,
    notes: row.notes ?? null,
    visit_number: row.visit_number ?? null,
    recorded_by: row.recorded_by,
    recorded_by_name: row.recorded_by_name ?? '',
    created_at: row.created_at ?? null,
    updated_by: row.updated_by ?? null,
    updated_by_name: row.updated_by_name ?? null,
    updated_at: row.updated_at ?? null,
    is_voided: Boolean(row.is_voided),
  };
}

/** Map GET /doctor/patient-visits response. */
export function mapDoctorPatientVisitsResponse(raw) {
  if (!raw) return { patient_id: null, patient_uid: null, patient_name: '', visit_date: null, visit_count: 0, visits: [] };
  return {
    patient_id: raw.patient_id ?? null,
    patient_uid: raw.patient_uid ?? null,
    patient_name: raw.patient_name ?? '',
    visit_date: raw.visit_date ?? null,
    visit_count: raw.visit_count ?? 0,
    visits: (raw.visits ?? []).map(mapDoctorPatientVisitItem).filter(Boolean),
  };
}

function mapDoctorVitalHistoryEntry(vital) {
  return {
    history_id: vital.history_id ?? vital.id,
    recorded_at: vital.recorded_at,
    recorded_by: vital.recorded_by_name ?? vital.recorded_by ?? null,
    status: vital.status ?? 'recorded',
    temperature: vital.temperature,
    blood_pressure: vital.blood_pressure,
    heart_rate: vital.heart_rate,
    respiratory_rate: vital.respiratory_rate,
    oxygen_saturation: vital.oxygen_saturation,
    blood_sugar: vital.blood_sugar,
    weight: vital.weight,
    pain_level: vital.pain_level,
    observation_notes: vital.observation_notes,
  };
}

/**
 * Prefer nested history when richer; otherwise build Recorded At options from flat list.
 */
export function withAssembledDoctorVitalHistory(latest, items = []) {
  if (!latest) return null;
  const list = items.length ? items : [latest];
  const maxNested = Math.max(0, ...list.map((item) => item.history?.length ?? 0));
  if (maxNested >= list.length) return latest;
  const history = [...list]
    .map(mapDoctorVitalHistoryEntry)
    .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
  if ((latest.history?.length ?? 0) >= history.length) return latest;
  return { ...latest, history };
}

/** Map one vitals row from GET /doctor/patients/{id}/vitals (nurse fields, doctor read-only). */
export function mapDoctorVitalItem(row) {
  if (!row) return null;
  const recordedByName = row.recorded_by_name ?? row.nurse_name ?? null;
  const history =
    Array.isArray(row.history) && row.history.length
      ? [...row.history]
          .map(mapDoctorVitalHistoryEntry)
          .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))
      : [mapDoctorVitalHistoryEntry({ ...row, recorded_by_name: recordedByName })];
  return {
    id: row.id,
    appointment_id: row.appointment_id ?? null,
    patient_id: row.patient_id ?? null,
    patient_uid: row.patient_uid ?? null,
    patient_name: row.patient_name ?? '',
    bed_number: row.bed_number ?? null,
    ward_name: row.ward_name ?? null,
    doctor_id: row.doctor_id ?? null,
    doctor_name: row.doctor_name ?? null,
    recorded_by: recordedByName,
    recorded_by_name: recordedByName,
    temperature: row.temperature ?? null,
    blood_pressure: row.blood_pressure ?? null,
    heart_rate: row.heart_rate ?? null,
    respiratory_rate: row.respiratory_rate ?? null,
    oxygen_saturation: row.oxygen_saturation ?? null,
    blood_sugar: row.blood_sugar ?? null,
    weight: row.weight ?? null,
    pain_level: row.pain_level ?? null,
    observation_notes: row.observation_notes ?? null,
    status: row.status ?? null,
    recorded_at: row.recorded_at ?? null,
    updated_at: row.updated_at ?? null,
    history,
  };
}

/** Map GET /doctor/patients/{id}/vitals paginated response. */
export function mapDoctorPatientVitalsResponse(raw) {
  if (!raw) return { success: true, total: 0, page: 1, page_size: 20, items: [] };
  return {
    success: raw.success !== false,
    total: Number(raw.total) || 0,
    page: Number(raw.page) || 1,
    page_size: Number(raw.page_size) || 20,
    items: (raw.items ?? []).map(mapDoctorVitalItem).filter(Boolean),
  };
}

function mapDoctorNoteHistoryEntry(note, fallbackCreatedBy = null) {
  return {
    history_id: note.history_id ?? note.id,
    created_at: note.created_at,
    created_by:
      note.created_by ??
      note.created_by_name ??
      note.nurse_name ??
      fallbackCreatedBy,
    status: note.status ?? 'active',
    symptoms: note.symptoms,
    treatment_response: note.treatment_response,
    additional_notes: note.additional_notes,
  };
}

/**
 * Prefer nested history when richer; otherwise build Created At options from flat list.
 */
export function withAssembledDoctorNoteHistory(latest, items = []) {
  if (!latest) return null;
  const list = items.length ? items : [latest];
  const maxNested = Math.max(0, ...list.map((item) => item.history?.length ?? 0));
  if (maxNested >= list.length) return latest;
  const history = [...list]
    .map((note) => mapDoctorNoteHistoryEntry(note))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if ((latest.history?.length ?? 0) >= history.length) return latest;
  return { ...latest, history };
}

/** Map one nursing note from GET /doctor/patients/{id}/notes. */
export function mapDoctorNoteItem(row) {
  if (!row) return null;
  const createdBy = row.created_by_name ?? row.nurse_name ?? null;
  const history =
    Array.isArray(row.history) && row.history.length
      ? [...row.history]
          .map((entry) => mapDoctorNoteHistoryEntry(entry, createdBy))
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      : [mapDoctorNoteHistoryEntry({ ...row, created_by: createdBy })];
  return {
    id: row.id,
    appointment_id: row.appointment_id ?? null,
    patient_id: row.patient_id ?? null,
    patient_uid: row.patient_uid ?? null,
    patient_name: row.patient_name ?? '',
    bed_number: row.bed_number ?? null,
    ward_name: row.ward_name ?? null,
    doctor_id: row.doctor_id ?? null,
    doctor_name: row.doctor_name ?? null,
    nurse_id: row.nurse_id ?? null,
    nurse_name: row.nurse_name ?? createdBy,
    created_by: createdBy,
    created_by_name: createdBy,
    symptoms: row.symptoms ?? null,
    treatment_response: row.treatment_response ?? null,
    additional_notes: row.additional_notes ?? null,
    status: row.status ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    history,
  };
}

/** Map GET /doctor/patients/{id}/notes paginated response. */
export function mapDoctorPatientNotesResponse(raw) {
  if (!raw) return { success: true, total: 0, page: 1, page_size: 20, items: [] };
  return {
    success: raw.success !== false,
    total: Number(raw.total) || 0,
    page: Number(raw.page) || 1,
    page_size: Number(raw.page_size) || 20,
    items: (raw.items ?? []).map(mapDoctorNoteItem).filter(Boolean),
  };
}
