import {
  getDashboardStats,
  getTodayAppointments,
  getAppointmentsByDate,
  getAppointmentsHistory,
  getAppointmentById,
  updateAppointmentStatus,
} from '@/features/doctor/api/appointments';
import { unwrapDoctorResponse } from '@/shared/api/utils/doctorResponseUtils';
import {
  apiToUiAppointment,
  apiToUiDashboardStats,
  uiDateToApiDate,
  uiStatusToApiStatus,
} from '@/shared/api/mappers/appointmentMapper';

function mapAppointmentsList(raw) {
  return unwrapDoctorResponse(raw, 'appointments')
    .map(apiToUiAppointment)
    .filter(Boolean);
}

export async function fetchDashboardStats(token) {
  const raw = await getDashboardStats(token);
  return apiToUiDashboardStats(raw);
}

export async function fetchTodayAppointments(token) {
  return getTodayAppointments(token).then(mapAppointmentsList);
}

export async function fetchAppointmentsByDate(uiDate, token) {
  const apiDate = uiDateToApiDate(uiDate);
  return getAppointmentsByDate(apiDate, token).then(mapAppointmentsList);
}

export async function fetchAppointmentsHistory(token) {
  return getAppointmentsHistory(token).then(mapAppointmentsList);
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
