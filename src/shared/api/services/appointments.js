import {
  getAppointments,
  createAppointment,
  updateAppointment,
  cancelAppointment,
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
  };
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

export async function listAppointmentsPage(token, params = {}) {
  const raw = await getAppointments(token, params);
  return mapAppointmentPage(raw);
}

export async function listAppointmentsAll(token, params = {}) {
  return fetchAllPages(
    (page, limit) => fetchAppointmentsPage(token, { ...params, page, limit }),
    { pageSize: params.limit ?? 100 }
  );
}

/** Appointments scheduled for the current calendar day (API date range). */
export async function listTodayAppointments(token, params = {}) {
  const { dateFrom, dateTo } = getTodayRangeIso();
  return listAppointmentsPage(token, {
    ...params,
    date_from: dateFrom,
    date_to: dateTo,
    limit: params.limit ?? 50,
    page: 1,
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

export function uiFilterStatusToApi(status) {
  if (!status || status === 'All') return undefined;
  return uiStatusToApiStatus(status);
}

/** Map OPD appointment list pills to GET /opd/appointments status param. */
export function resolveOpdAppointmentListApiStatus(filterStatus) {
  if (filterStatus === 'Completed') return 'completed';
  if (filterStatus === 'Cancelled') return 'cancelled';
  if (
    !filterStatus ||
    filterStatus === 'All' ||
    filterStatus === 'Scheduled' ||
    filterStatus === 'Pending'
  ) {
    return 'scheduled';
  }
  return uiFilterStatusToApi(filterStatus);
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
