/** Doctor appointment API — root /appointments paths (not OPD) */

import { apiClient } from '@/shared/api/client';

export async function getDashboardStats(token) {
  return apiClient('/appointments/dashboard-stats', { token });
}

export async function getTodayAppointments(token) {
  return apiClient('/appointments/today', { token });
}

export async function getAppointmentsByDate(date, token) {
  return apiClient(`/appointments/by-date/${encodeURIComponent(date)}`, { token });
}

export async function getAppointmentsHistory(token) {
  return apiClient('/appointments/history', { token });
}

/** GET /appointments/{id} — fresh detail from API (not list row data). */
export async function getAppointmentById(appointmentId, token) {
  return apiClient(`/appointments/${appointmentId}`, { token });
}

export async function updateAppointmentStatus(appointmentId, body, token) {
  const response = await apiClient(`/appointments/${appointmentId}/status`, {
    method: 'PUT',
    body: JSON.stringify(body),
    token,
  });
  return response?.appointment ?? response;
}
