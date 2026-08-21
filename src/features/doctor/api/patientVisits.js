/** Doctor patient visits API — mirrors HM-Backend /doctor/patient-visits. */

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

export function getDoctorPatientVisits(params, token) {
  return apiClient(appendQuery('/doctor/patient-visits', params), { token });
}
