/**
 * Appointment UI ↔ API field mapping (live HTTP only).
 */

import { parseOpdDateString } from '@/features/doctor/utils/doctorDates';

const IST_OFFSET = '+05:30';

const API_STATUS_TO_UI = {
  scheduled: 'Scheduled',
  waiting: 'Waiting',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const UI_STATUS_TO_API = {
  Scheduled: 'scheduled',
  Waiting: 'waiting',
  'In Progress': 'in_progress',
  Completed: 'completed',
  Cancelled: 'cancelled',
  Priority: 'waiting',
};

export function apiStatusToUiStatus(apiStatus) {
  if (apiStatus == null || apiStatus === '') return null;
  const key = String(apiStatus).toLowerCase();
  return API_STATUS_TO_UI[key] ?? apiStatus;
}

export function uiStatusToApiStatus(uiStatus) {
  if (uiStatus == null || uiStatus === '') return null;
  if (UI_STATUS_TO_API[uiStatus]) return UI_STATUS_TO_API[uiStatus];
  return String(uiStatus).toLowerCase().replace(/\s+/g, '_');
}

/** UI display date (en-GB) → YYYY-MM-DD for /appointments/by-date/{date} */
export function uiDateToApiDate(uiDate) {
  const d = parseOpdDateString(uiDate);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatAppointmentDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime())
    ? raw
    : d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
}

function resolveAppointmentIds(apiAppt) {
  const rawId = apiAppt.id;
  const uid = apiAppt.appointment_uid ?? null;
  const numericId =
    typeof rawId === 'number'
      ? rawId
      : uid && rawId != null && !Number.isNaN(Number(rawId))
        ? Number(rawId)
        : apiAppt.db_id ?? apiAppt.dbId ?? null;

  if (uid) {
    return { id: uid, dbId: numericId };
  }
  if (typeof rawId === 'string' && !/^\d+$/.test(rawId)) {
    return { id: rawId, dbId: apiAppt.db_id ?? apiAppt.dbId ?? null };
  }
  return { id: String(rawId ?? ''), dbId: numericId ?? (typeof rawId === 'number' ? rawId : null) };
}

/** Combine UI date + time_slot into timezone-aware ISO for backend scheduled_at */
export function buildScheduledAt(appointmentDate, timeSlot) {
  const dateStr = (appointmentDate ?? '').trim();
  const slot = (timeSlot ?? '').trim();
  if (!dateStr || !slot) return null;

  let year;
  let month;
  let day;
  const isoDate = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    year = isoDate[1];
    month = isoDate[2];
    day = isoDate[3];
  } else {
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return null;
    year = String(parsed.getFullYear());
    month = String(parsed.getMonth() + 1).padStart(2, '0');
    day = String(parsed.getDate()).padStart(2, '0');
  }

  const timeMatch24 = slot.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch24) {
    const hours = parseInt(timeMatch24[1], 10);
    const minutes = timeMatch24[2];
    return `${year}-${month}-${day}T${String(hours).padStart(2, '0')}:${minutes}:00${IST_OFFSET}`;
  }

  const timeMatch = slot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!timeMatch) return null;

  let hours = parseInt(timeMatch[1], 10);
  const minutes = timeMatch[2];
  const meridiem = timeMatch[3].toUpperCase();
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  return `${year}-${month}-${day}T${String(hours).padStart(2, '0')}:${minutes}:00${IST_OFFSET}`;
}

export function apiToUiAppointment(apiAppt) {
  if (!apiAppt) return null;
  const { id, dbId } = resolveAppointmentIds(apiAppt);
  const dateRaw =
    apiAppt.appointment_date ?? apiAppt.scheduled_at ?? apiAppt.date;
  let timeRaw =
    apiAppt.appointment_time ?? apiAppt.time_slot ?? apiAppt.time;
  if (!timeRaw && apiAppt.scheduled_at) {
    const scheduled = new Date(apiAppt.scheduled_at);
    if (!Number.isNaN(scheduled.getTime())) {
      timeRaw = scheduled.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
  }

  return {
    id,
    dbId,
    patientUid:
      apiAppt.patient_uhid ??
      apiAppt.patient_uid ??
      apiAppt.patientUid ??
      null,
    patientDbId: (() => {
      const raw = apiAppt.patient_id ?? apiAppt.patientDbId;
      if (raw == null) return null;
      const n = Number(raw);
      return Number.isNaN(n) ? null : n;
    })(),
    patientId:
      apiAppt.patient_uhid ??
      apiAppt.patient_uid ??
      apiAppt.patientUid ??
      null,
    patientName: apiAppt.patient_name ?? apiAppt.patientName,
    patientAge: apiAppt.patient_age ?? apiAppt.patientAge ?? null,
    patientGender: apiAppt.patient_gender ?? apiAppt.patientGender ?? null,
    doctorId: apiAppt.doctor_id ?? apiAppt.doctorId,
    doctorName: apiAppt.doctor_name ?? apiAppt.doctorName,
    deptId: apiAppt.department_id ?? apiAppt.dept_id ?? apiAppt.deptId,
    deptName: apiAppt.department_name ?? apiAppt.dept_name ?? apiAppt.deptName,
    date: formatAppointmentDate(dateRaw),
    time: timeRaw,
    scheduledAt: apiAppt.scheduled_at ?? null,
    status: apiStatusToUiStatus(apiAppt.status),
    type: apiAppt.appointment_type ?? apiAppt.type,
    reason: apiAppt.reason ?? apiAppt.notes,
    notes: apiAppt.notes,
    symptoms: apiAppt.symptoms ?? null,
    diagnosis: apiAppt.diagnosis ?? null,
    followUpDate:
      apiAppt.follow_up_date ?? apiAppt.follow_up ?? apiAppt.followUpDate ?? apiAppt.followUp ?? null,
    createdAt: apiAppt.created_at ?? apiAppt.createdAt ?? null,
    paymentStatus: apiAppt.payment_status ?? apiAppt.paymentStatus ?? null,
    visitId: apiAppt.visit_id ?? apiAppt.visitId ?? apiAppt.bill_id ?? apiAppt.billId ?? null,
    billId: apiAppt.bill_id ?? apiAppt.billId ?? apiAppt.visit_id ?? apiAppt.visitId ?? null,
    billNumber: apiAppt.bill_number ?? apiAppt.billNumber ?? null,
    totalAmount: apiAppt.total_amount ?? apiAppt.totalAmount ?? 0,
    paidAmount: apiAppt.paid_amount ?? apiAppt.paidAmount ?? 0,
    balanceAmount: apiAppt.balance_amount ?? apiAppt.balanceAmount ?? 0,
  };
}

export function uiToApiAppointment(uiAppt) {
  if (!uiAppt) return null;
  const appointment_date = uiAppt.date;
  const time_slot = uiAppt.time;
  const scheduled_at = buildScheduledAt(appointment_date, time_slot);

  const body = {
    patient_id: uiAppt.patientId,
    patient_name: uiAppt.patientName,
    doctor_id: uiAppt.doctorId,
    doctor_name: uiAppt.doctorName,
    dept_id: uiAppt.deptId,
    dept_name: uiAppt.deptName,
    appointment_date,
    time_slot,
    status: uiStatusToApiStatus(uiAppt.status) ?? uiAppt.status?.toLowerCase(),
    consult_status: uiAppt.consultStatus,
    type: uiAppt.type,
    notes: uiAppt.reason ?? uiAppt.notes,
  };

  if (scheduled_at) body.scheduled_at = scheduled_at;

  if (uiAppt.dbId) body.id = uiAppt.dbId;
  else if (uiAppt.id) body.id = uiAppt.id;
  return body;
}

/** POST /opd/appointments body */
export function uiToApiOpdAppointmentCreate(uiAppt) {
  if (!uiAppt) return null;
  const scheduled_at = buildScheduledAt(uiAppt.date, uiAppt.time);
  if (!scheduled_at) {
    throw new Error('Invalid appointment date or time');
  }

  const patientDbId = uiAppt.patientDbId ?? uiAppt.patient_id;
  const parsedPatientId = Number(patientDbId);
  if (!parsedPatientId || Number.isNaN(parsedPatientId)) {
    throw new Error('Patient record id is required to book an appointment');
  }

  return {
    patient_id: parsedPatientId,
    doctor_id: Number(uiAppt.doctorId),
    department_id: Number(uiAppt.deptId),
    scheduled_at,
    reason: uiAppt.reason ?? uiAppt.notes ?? undefined,
    notes: uiAppt.notes ?? undefined,
    appointment_type: 'opd',
  };
}

/** PATCH /opd/appointments/{id} body */
export function uiToApiOpdAppointmentPatch(uiAppt) {
  if (!uiAppt) return null;
  const body = {};
  if (uiAppt.status) {
    body.status = uiStatusToApiStatus(uiAppt.status) ?? uiAppt.status?.toLowerCase();
  }
  const scheduled_at = buildScheduledAt(uiAppt.date, uiAppt.time);
  if (scheduled_at) body.scheduled_at = scheduled_at;
  if (uiAppt.notes) body.notes = uiAppt.notes;
  return body;
}
