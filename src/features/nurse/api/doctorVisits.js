/** Nurse Doctor Visits API — mirrors HM-Backend /nurse/doctor-visits/* routes. */

import { apiClient } from '@/shared/api/client';

function appendQuery(path, params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

export function listDoctorVisits(params, token) {
  return apiClient(appendQuery('/nurse/doctor-visits', params), { token });
}

export function listActiveDoctors(params, token) {
  return apiClient(appendQuery('/nurse/doctor-visits/doctors', params), { token });
}

export function listDepartments(params, token) {
  return apiClient(appendQuery('/nurse/other-visits/departments', params), { token });
}

export function createDoctorVisit(body, token) {
  return apiClient('/nurse/doctor-visits', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  });
}

export function updateDoctorVisit(visitId, body, token) {
  return apiClient(`/nurse/doctor-visits/${visitId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
    token,
  });
}

export function voidDoctorVisit(visitId, body, token) {
  return apiClient(`/nurse/doctor-visits/${visitId}/void`, {
    method: 'PUT',
    body: JSON.stringify(body),
    token,
  });
}
