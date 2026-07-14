import {
  getTodayAppointments,
  getAppointmentsByDate,
  getAppointmentById,
  updateAppointmentStatus,
} from '@/features/doctor/api/appointments';
import { listAppointmentsAll } from '@/shared/api/services/appointments';
import { unwrapDoctorResponse } from '@/shared/api/utils/doctorResponseUtils';
import {
  apiToUiAppointment,
  uiDateToApiDate,
  uiStatusToApiStatus,
} from '@/shared/api/mappers/appointmentMapper';
import { enrichDoctorAppointmentsWithOpdPayment } from '@/features/doctor/utils/doctorAppointmentPayment';
import { getTodayRangeIso } from '@/shared/utils/opdDates';

function mapAppointmentsList(raw) {
  return unwrapDoctorResponse(raw, 'appointments')
    .map(apiToUiAppointment)
    .filter(Boolean);
}

async function loadOpdAppointmentsForDate(token, uiDate) {
  try {
    const dateKey = uiDate ? uiDateToApiDate(uiDate) : getTodayRangeIso().dateKey;
    return await listAppointmentsAll(token, {
      date: dateKey,
      list_filter: 'all',
      sort: 'scheduled_at',
      order: 'asc',
    });
  } catch {
    return [];
  }
}

async function fetchDoctorAppointmentsWithOpdPayment(fetchDoctorList, token, uiDate) {
  const [doctorRaw, opdAppts] = await Promise.all([
    fetchDoctorList(),
    loadOpdAppointmentsForDate(token, uiDate),
  ]);
  return enrichDoctorAppointmentsWithOpdPayment(mapAppointmentsList(doctorRaw), opdAppts);
}

export async function fetchTodayAppointments(token) {
  return fetchDoctorAppointmentsWithOpdPayment(
    () => getTodayAppointments(token),
    token,
  );
}

export async function fetchAppointmentsByDate(uiDate, token) {
  const apiDate = uiDateToApiDate(uiDate);
  return fetchDoctorAppointmentsWithOpdPayment(
    () => getAppointmentsByDate(apiDate, token),
    token,
    uiDate,
  );
}

export async function fetchAppointmentById(id, token) {
  const raw = await getAppointmentById(id, token);
  const appointment = raw?.appointment ?? raw;
  return apiToUiAppointment(appointment);
}

/** @param {{ dbId: number, id?: string }} appointmentRef */
export async function putAppointmentStatus(appointmentRef, patch, token) {
  const dbId = appointmentRef.dbId;
  if (dbId == null) {
    throw new Error('Appointment dbId is required for status update');
  }
  const status = uiStatusToApiStatus(patch.status ?? patch.consultStatus);
  const updated = await updateAppointmentStatus(dbId, { status }, token);
  return apiToUiAppointment(updated);
}
