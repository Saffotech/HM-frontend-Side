/**
 * Receptionist API — live GET /receptionist/* with server-side filters & pagination.
 */

import { apiClient } from '@/shared/api/client';
import { formatSlotTime24To12 } from '@/shared/utils/slotTime';
import { formatDate } from '../utils/date';
import { cleanParams, buildPagination } from '../utils/params';
import { deriveQueueDisplayStatus } from '../utils/queueStatus';

function appendQuery(path, params = {}) {
  const search = new URLSearchParams();
  Object.entries(cleanParams(params)).forEach(([key, value]) => {
    search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

function formatTime(value) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return String(value);
  }
}

function resolveAppointmentDisplayTime(row) {
  if (!row) return '—';

  const status = String(row.status || '').toLowerCase();

  if (row.scheduled_at) {
    return formatTime(row.scheduled_at);
  }

  if (status === 'completed') {
    return formatTime(row.consultation_started_at || row.consultation_completed_at || row.checked_in_at);
  }

  return '—';
}

function formatDay(value) {
  if (!value) return formatDate(new Date());
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
    return formatDate(d);
  } catch {
    return String(value).slice(0, 10);
  }
}

/** Map backend queue/history row → UI patient shape (patient_uid === UHID) */
function mapQueueItemToUi(row) {
  if (!row) return null;
  const status = String(row.status || '').toLowerCase();

  return {
    id: row.appointment_id,
    appointment_id: row.appointment_id,
    patient_uid: row.patient_uid || '—',
    uhid: row.patient_uid || '—',
    name: row.patient_name || '—',
    phone: row.patient_phone || '—',
    doctor_id: row.doctor_id,
    doctor_name: row.doctor_name || (row.doctor_id != null ? `Doctor #${row.doctor_id}` : '—'),
    department_id: row.department_id ?? null,
    department: row.department_name ?? row.department ?? null,
    status: row.status,
    display_status: deriveQueueDisplayStatus(row.status, row.payment_status),
    payment_status: row.payment_status,
    scheduled_at: resolveAppointmentDisplayTime(row),
    checked_in_at: formatTime(row.checked_in_at),
    called_at: formatTime(row.consultation_started_at),
    completed_at: status === 'completed' ? formatTime(row.consultation_started_at) : '—',
    cancelled_at: status === 'cancelled' ? formatTime(row.checked_in_at) : null,
    date: formatDay(row.scheduled_at || row.checked_in_at || row.consultation_started_at),
    queue_date: row.queue_date ?? null,
  };
}

function mapScheduleDoctor(row) {
  if (!row) return null;
  return {
    id: row.doctor_id,
    name: row.doctor_name || `Doctor #${row.doctor_id}`,
    department_id: row.department_id ?? null,
    department: row.department ?? row.specialization ?? null,
    room_no: row.room_no ?? null,
    specialization: row.specialization ?? null,
    shift_start: row.shift_start,
    shift_end: row.shift_end,
    total_slots: row.total_slots ?? 0,
    booked_slots: row.booked_slots ?? 0,
    available_slots: row.available_slots ?? 0,
    status: row.status,
    schedule_date: row.schedule_date,
    slots: row.slots ?? null,
  };
}

function dedupeQueueRows(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const id = row?.appointment_id;
    if (id == null) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function mapPaginatedQueue(raw, listKey = 'queue') {
  const rows = dedupeQueueRows(
    (raw?.[listKey] || []).map(mapQueueItemToUi).filter(Boolean),
  );
  const pagination = buildPagination(raw?.total, raw?.page, raw?.limit);
  return {
    rows,
    ...pagination,
    queue_date: raw?.queue_date ?? null,
    date_from: raw?.date_from ?? null,
    date_to: raw?.date_to ?? null,
    doctor_id: raw?.doctor_id ?? null,
  };
}

export const receptionistApi = {
  getDashboardStats: async (params = {}) => {
    const raw = await apiClient(appendQuery('/receptionist/dashboard', params));
    const data = raw?.data ?? raw ?? {};
    return {
      scheduled: data.todays_paid_appointments ?? 0,
      pending: data.todays_unpaid_appointments ?? 0,
      completed: data.completed ?? 0,
      cancelled: data.todays_cancelled ?? 0,
      total: data.total_patients ?? 0,
      todays_paid_appointments: data.todays_paid_appointments ?? 0,
      todays_unpaid_appointments: data.todays_unpaid_appointments ?? 0,
      todays_cancelled: data.todays_cancelled ?? 0,
    };
  },

  getTodayQueue: async (params = {}) => {
    const raw = await apiClient(appendQuery('/receptionist/today-queue', params));
    return mapPaginatedQueue(raw, 'queue');
  },

  getDoctorQueue: async (doctorId, params = {}) => {
    const raw = await apiClient(
      appendQuery(`/receptionist/doctor-queue/${doctorId}`, params),
    );
    return mapPaginatedQueue(raw, 'queue');
  },

  getQueueHistory: async (params = {}) => {
    const raw = await apiClient(appendQuery('/receptionist/queue-history', params));
    return mapPaginatedQueue(raw, 'history');
  },

  /** Doctors for filters/lists — from schedule endpoint (no dedicated doctors API). */
  getDoctors: async (params = {}) => {
    const today = formatDate(new Date());
    const raw = await apiClient(
      appendQuery('/receptionist/doctors/schedule', {
        date: today,
        page: 1,
        page_size: 100,
        ...params,
      }),
    );
    const items = (raw?.items || []).map(mapScheduleDoctor).filter(Boolean);
    const byId = new Map();
    items.forEach((d) => {
      if (!byId.has(d.id)) byId.set(d.id, d);
    });
    return Array.from(byId.values());
  },

  /** Per-slot schedule from doctors/schedule?include_slots=true */
  getDoctorTimeSlots: async (doctorId, params = {}) => {
    const today = formatDate(new Date());
    const raw = await apiClient(
      appendQuery('/receptionist/doctors/schedule', {
        date: today,
        doctor_id: doctorId,
        page: 1,
        page_size: 1,
        include_slots: true,
        ...params,
      }),
    );
    const row = (raw?.items || [])[0];
    if (!row) return [];

    if (Array.isArray(row.slots) && row.slots.length > 0) {
      return row.slots.map((slot) => ({
        time: formatSlotTime24To12(slot.slot_start),
        time24: slot.slot_start,
        available: Boolean(slot.is_available),
        isFree: Boolean(slot.is_available),
        slot_start: slot.slot_start,
        slot_end: slot.slot_end,
        status: slot.status,
      }));
    }

    const start = row.shift_start;
    const end = row.shift_end;
    if (!start || !end) return [];
    const booked = row.booked_slots ?? 0;
    const available = row.available_slots ?? 0;
    return [
      {
        time: `${start} – ${end}`,
        isFree: available > 0,
        patientCount: booked,
        total_slots: row.total_slots ?? 0,
        booked_slots: booked,
        available_slots: available,
      },
    ];
  },
};
