/** Mirrors backend appointment routes — OPD department */

import { apiClient } from '@/shared/api/client';
import { buildQueryString } from '@/shared/utils/buildQueryString';

export async function getAppointments(token, params = {}) {
  const query = buildQueryString({
    status: params.status,
    date_from: params.date_from,
    date_to: params.date_to,
    page: params.page,
    limit: params.limit,
  });
  return apiClient(`/opd/appointments${query}`, { token });
}

export async function createAppointment(data, token) {
  return apiClient('/opd/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  });
}

export async function updateAppointment(id, data, token) {
  return apiClient(`/opd/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    token,
  });
}

export async function cancelAppointment(id, token) {
  return apiClient(`/opd/appointments/${id}/cancel`, {
    method: 'POST',
    token,
  });
}

export async function getDoctorSlots(doctorId, departmentId, date, token) {
  const qs = new URLSearchParams({
    department_id: String(departmentId),
    date: String(date),
  });
  return apiClient(
    `/opd/appointments/doctor/${doctorId}/slots?${qs.toString()}`,
    { token }
  );
}
