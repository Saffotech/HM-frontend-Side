/** Doctor patient vitals & nursing notes — GET /doctor/patients/{id}/vitals|notes (read-only). */

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

export function getDoctorPatientVitals(patientId, params, token) {
  return apiClient(
    appendQuery(`/doctor/patients/${patientId}/vitals`, params),
    { token },
  );
}

export function getDoctorPatientNotes(patientId, params, token) {
  return apiClient(
    appendQuery(`/doctor/patients/${patientId}/notes`, params),
    { token },
  );
}
