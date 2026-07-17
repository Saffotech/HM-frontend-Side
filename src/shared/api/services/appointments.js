import {
  getAppointments,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  deleteAppointment,
  getDoctorSlots,
} from '@/features/opd/api/appointments';
import { mapApiDoctorSlots } from '@/shared/utils/slotTime';
import { asList } from '@/shared/api/dataSource';
import {
  apiToUiAppointment,
  uiToApiOpdAppointmentCreate,
  uiToApiOpdAppointmentPatch,
  uiStatusToApiStatus,
} from '@/shared/api/mappers/appointmentMapper';
import { fetchAllPages, totalPagesFrom } from '@/shared/utils/fetchAllPages';
import { getTodayRangeIso } from '@/shared/utils/opdDates';
import {
  normalizeAppointmentListParams,
  simplifyAppointmentListParams,
  minimalAppointmentListParams,
} from '@/shared/api/utils/opdAppointmentParams';
import { isSameOpdCalendarDay } from '@/shared/utils/opdDates';

function mapAppointmentPage(raw) {
  const appointments = asList(raw)
    .map(apiToUiAppointment)
    .filter(Boolean);
  const total = raw?.total ?? appointments.length;
  const page = raw?.page ?? 1;
  const limit = raw?.limit ?? appointments.length;
  return {
    appointments,
    total,
    page,
    limit,
    totalPages: totalPagesFrom(total, limit),
    counts: raw?.counts ?? null,
    list_counts: raw?.list_counts ?? null,
  };
}

const EMPTY_APPOINTMENT_PAGE = {
  appointments: [],
  total: 0,
  page: 1,
  limit: 50,
  totalPages: 0,
  counts: null,
  list_counts: null,
};

function filterAppointmentsByDate(appointments, dateKey) {
  if (!dateKey) return appointments;
  return appointments.filter((appt) =>
    isSameOpdCalendarDay(appt.scheduledAt ?? appt.date, dateKey)
  );
}

async function fetchAppointmentsPage(token, params) {
  const raw = await getAppointments(token, params);
  const mapped = mapAppointmentPage(raw);
  return {
    items: mapped.appointments,
    total: mapped.total,
    page: mapped.page,
    limit: mapped.limit,
    totalPages: mapped.totalPages,
  };
}

export async function listAppointmentsPage(token, params = {}, options = {}) {
  const { softFail = false } = options;
  const normalized = normalizeAppointmentListParams(params);
  const dateKey = normalized.date;
  const tiers = [
    normalized,
    simplifyAppointmentListParams(normalized),
    minimalAppointmentListParams(normalized),
  ];

  let lastError;
  for (const tier of tiers) {
    try {
      const raw = await getAppointments(token, tier);
      const mapped = mapAppointmentPage(raw);
      if (dateKey && !tier.date) {
        const filtered = filterAppointmentsByDate(mapped.appointments, dateKey);
        return {
          ...mapped,
          appointments: filtered,
          total: filtered.length,
          totalPages: Math.max(1, Math.ceil(filtered.length / (mapped.limit || 50))),
        };
      }
      return mapped;
    } catch (err) {
      lastError = err;
      if (err?.status !== 500) throw err;
    }
  }

  if (softFail) return { ...EMPTY_APPOINTMENT_PAGE, limit: normalized.limit ?? 50, page: normalized.page ?? 1 };
  throw lastError;
}

export async function listAppointmentsAll(token, params = {}) {
  return fetchAllPages(
    (page, limit) => fetchAppointmentsPage(token, { ...params, page, limit }),
    { pageSize: params.limit ?? 100 }
  );
}

/** Appointments scheduled for the current calendar day (API date param). */
export async function listTodayAppointments(token, params = {}) {
  const { dateKey } = getTodayRangeIso();
  return listAppointmentsPage(token, {
    ...params,
    date: dateKey,
    limit: params.limit ?? 50,
    page: 1,
    sort: 'scheduled_at',
    order: 'asc',
  }).then((r) => r.appointments);
}

export async function bookAppointment(appointment, token) {
  return createAppointment(uiToApiOpdAppointmentCreate(appointment), token).then(
    apiToUiAppointment
  );
}

export async function patchAppointment(id, data, token) {
  const appointmentId = data.dbId ?? id;
  return updateAppointment(appointmentId, uiToApiOpdAppointmentPatch(data), token).then(
    apiToUiAppointment
  );
}

export async function cancelAppointmentById(id, token) {
  return cancelAppointment(id, token);
}

export async function deleteAppointmentById(id, token) {
  return deleteAppointment(id, token);
}

export function uiFilterStatusToApi(status) {
  if (!status || status === 'All') return undefined;
  return uiStatusToApiStatus(status);
}

/** Map OPD appointment list pills to GET /opd/appointments list_filter param. */
export function resolveOpdAppointmentListFilter(filterStatus) {
  const map = {
    All: 'all',
    Scheduled: 'scheduled',
    Pending: 'pending',
    Completed: 'completed',
    Cancelled: 'cancelled',
  };
  return map[filterStatus] ?? 'all';
}

function matchesPatientAppointment(appt, patientUid, patientDbId) {
  if (!appt) return false;
  if (patientUid && (appt.patientId === patientUid || appt.patientUid === patientUid)) {
    return true;
  }
  if (patientDbId != null) {
    return (
      appt.patientDbId === patientDbId ||
      String(appt.patientDbId) === String(patientDbId)
    );
  }
  return false;
}

/** Paginated slice of appointments for one patient (scans API pages, capped). */
export async function listAppointmentsForPatientPage(
  token,
  { patientUid, patientDbId, page = 1, limit = 20, maxScanPages = 15 } = {}
) {
  const patientPageSize = limit;
  const neededStart = (page - 1) * patientPageSize;
  const neededEnd = neededStart + patientPageSize;
  const matched = [];
  let apiPage = 1;
  let apiTotalPages = 1;

  while (apiPage <= maxScanPages && matched.length < neededEnd) {
    const result = await listAppointmentsPage(token, { page: apiPage, limit: 50 });
    apiTotalPages = result.totalPages ?? 1;
    for (const appt of result.appointments) {
      if (matchesPatientAppointment(appt, patientUid, patientDbId)) {
        matched.push(appt);
      }
    }
    if (apiPage >= apiTotalPages) break;
    apiPage += 1;
  }

  const slice = matched.slice(neededStart, neededEnd);
  const total = matched.length;
  return {
    appointments: slice,
    total,
    page,
    limit: patientPageSize,
    totalPages: Math.max(1, Math.ceil(total / patientPageSize)),
  };
}

export async function fetchDoctorSlots(token, { doctorId, departmentId, date }) {
  const raw = await getDoctorSlots(doctorId, departmentId, date, token);
  return mapApiDoctorSlots(raw);
}
