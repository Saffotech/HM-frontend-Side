import {
  isConsultCancelled,
  isConsultCompleted,
  getAppointmentStatus,
  isDoctorSchedulableAppointment,
} from '@/features/doctor/utils/appointmentWorkflow';
import { appointmentToVisitRow } from '@/shared/api/mappers/doctorPatientMapper';

export const DASHBOARD_PREVIEW_LIMIT = 10;

export const PATIENT_CATEGORY_FILTER = {
  COMPLETED: 'completed',
  TODAY: 'today',
  QUEUE: 'queue',
  IN_PROGRESS: 'in-progress',
  CANCELLED: 'cancelled',
  ALL: 'all',
};

export const PATIENT_CATEGORY_OPTIONS = [
  { value: PATIENT_CATEGORY_FILTER.COMPLETED, label: 'Completed' },
  { value: PATIENT_CATEGORY_FILTER.QUEUE, label: 'Scheduled Today' },
  { value: PATIENT_CATEGORY_FILTER.CANCELLED, label: 'Cancelled' },
  { value: PATIENT_CATEGORY_FILTER.ALL, label: 'All' },
];

export const TODAY_APPOINTMENT_CATEGORIES = new Set([
  PATIENT_CATEGORY_FILTER.QUEUE,
  PATIENT_CATEGORY_FILTER.IN_PROGRESS,
  PATIENT_CATEGORY_FILTER.CANCELLED,
  PATIENT_CATEGORY_FILTER.ALL,
]);

export const DATE_FILTER_DISABLED_CATEGORIES = new Set([
  PATIENT_CATEGORY_FILTER.QUEUE,
  PATIENT_CATEGORY_FILTER.IN_PROGRESS,
  PATIENT_CATEGORY_FILTER.CANCELLED,
]);

function rowSortKey(row) {
  const raw = row.scheduledAt ?? row.visitAt;
  const t = raw ? new Date(raw).getTime() : 0;
  return Number.isNaN(t) ? 0 : t;
}

function appointmentPatientKey(appt) {
  if (!appt) return null;
  if (appt.patientUid) return String(appt.patientUid);
  if (appt.patientDbId != null) return `pid-${appt.patientDbId}`;
  if (appt.patientId != null) return String(appt.patientId);
  return appt.id != null ? String(appt.id) : null;
}

function appointmentSortKey(appt) {
  const t = appt?.scheduledAt ? new Date(appt.scheduledAt).getTime() : 0;
  const time = Number.isNaN(t) ? 0 : t;
  const dbId = Number(appt?.dbId) || 0;
  return time * 1_000_000 + dbId;
}

/** One dashboard row per patient — keeps the latest visit when duplicates exist. */
export function dedupeAppointmentsByPatient(appointments = []) {
  const byPatient = new Map();
  for (const appt of appointments) {
    const key = appointmentPatientKey(appt);
    if (!key) continue;
    const existing = byPatient.get(key);
    if (!existing || appointmentSortKey(appt) > appointmentSortKey(existing)) {
      byPatient.set(key, appt);
    }
  }
  return [...byPatient.values()];
}

function visitPatientKey(row) {
  if (!row) return null;
  if (row.patientUid) return String(row.patientUid);
  if (row.patientId != null) return String(row.patientId);
  return row.id != null ? String(row.id) : null;
}

function visitSortKey(row) {
  const raw = row.scheduledAt ?? row.visitAt;
  const time = raw ? new Date(raw).getTime() : 0;
  const sortTime = Number.isNaN(time) ? 0 : time;
  const dbId = Number(row.appointmentDbId) || 0;
  return sortTime * 1_000_000 + dbId;
}

/** One patient list row per patient — keeps the latest visit when duplicates exist. */
export function dedupeVisitRowsByPatient(rows = []) {
  const byPatient = new Map();
  for (const row of rows) {
    const key = visitPatientKey(row);
    if (!key) continue;
    const existing = byPatient.get(key);
    if (!existing || visitSortKey(row) > visitSortKey(existing)) {
      byPatient.set(key, row);
    }
  }
  return [...byPatient.values()].sort((a, b) => visitSortKey(b) - visitSortKey(a));
}

function dedupeVisitRows(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key =
      row.appointmentDbId != null
        ? `appt-${row.appointmentDbId}`
        : `${row.patientUid ?? row.id}-${row.scheduledAt ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out.sort((a, b) => rowSortKey(b) - rowSortKey(a));
}

export function buildPatientListByCategory({
  category,
  completedVisits = [],
  todayAppointments = [],
}) {
  const todayRows = todayAppointments
    .filter(isDoctorSchedulableAppointment)
    .map(appointmentToVisitRow)
    .filter(Boolean);
  const queueRows = todayRows.filter(
    (row) => !isConsultCompleted(row) && !isConsultCancelled(row)
  );
  const inProgressRows = todayRows.filter(
    (row) => getAppointmentStatus(row) === 'In Progress' || getAppointmentStatus(row) === 'Waiting'
  );
  const cancelledRows = todayRows.filter((row) => getAppointmentStatus(row) === 'Cancelled');

  switch (category) {
    case PATIENT_CATEGORY_FILTER.QUEUE:
      return dedupeVisitRows(queueRows);
    case PATIENT_CATEGORY_FILTER.IN_PROGRESS:
      return dedupeVisitRows(inProgressRows);
    case PATIENT_CATEGORY_FILTER.CANCELLED:
      return dedupeVisitRows(cancelledRows);
    case PATIENT_CATEGORY_FILTER.ALL:
      return dedupeVisitRows([...todayRows, ...completedVisits]);
    case PATIENT_CATEGORY_FILTER.COMPLETED: {
      const completedToday = todayRows.filter(isConsultCompleted);
      const merged = dedupeVisitRows([...completedVisits, ...completedToday]);
      return dedupeVisitRowsByPatient(merged);
    }
    default:
      return completedVisits;
  }
}

export function categoryEmptyMessage(category) {
  switch (category) {
    case PATIENT_CATEGORY_FILTER.QUEUE:
      return 'No scheduled appointments for today.';
    case PATIENT_CATEGORY_FILTER.IN_PROGRESS:
      return 'No scheduled appointments for today.';
    case PATIENT_CATEGORY_FILTER.CANCELLED:
      return 'No cancelled appointments today.';
    case PATIENT_CATEGORY_FILTER.ALL:
      return 'No patient records found.';
    default:
      return 'No completed visits found. Try adjusting search or date filters.';
  }
}
