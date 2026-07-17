/** Mirrors backend appointment routes — OPD department */

import { apiClient } from '@/shared/api/client';
import { buildQueryString } from '@/shared/utils/buildQueryString';
import { normalizeAppointmentListParams } from '@/shared/api/utils/opdAppointmentParams';

export async function getAppointments(token, params = {}) {
  const p = normalizeAppointmentListParams(params);
  const query = buildQueryString({
    patient_id: p.patient_id,
    doctor_id: p.doctor_id,
    department_id: p.department_id,
    search: p.search,
    date: p.date,
    date_from: p.date_from,
    date_to: p.date_to,
    status: p.status,
    list_filter: p.list_filter,
    sort: p.sort,
    order: p.order,
    page: p.page,
    limit: p.limit,
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

export async function deleteAppointment(id, token) {
  return apiClient(`/opd/appointments/${id}`, {
    method: 'DELETE',
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
