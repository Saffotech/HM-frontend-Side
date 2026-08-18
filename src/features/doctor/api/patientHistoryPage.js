import { apiClient } from '@/shared/api/client';
import { unwrapDoctorResponse } from '@/shared/api/utils/doctorResponseUtils';

/** GET /patients/{uhid} — full paginated response wrapper. */
export async function getPatientHistoryPage(patientUhid, token, params = {}) {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set('page', String(params.page));
  if (params.page_size != null) qs.set('page_size', String(params.page_size));
  else if (params.limit != null) qs.set('page_size', String(params.limit));
  if (params.encounter_type) qs.set('encounter_type', params.encounter_type);
  const query = qs.toString();
  const path = query
    ? `/patients/${encodeURIComponent(patientUhid)}?${query}`
    : `/patients/${encodeURIComponent(patientUhid)}`;
  const response = await apiClient(path, { token });

  const items =
    unwrapDoctorResponse(response, 'patient_history')
    ?? unwrapDoctorResponse(response, 'items')
    ?? [];

  return {
    items: Array.isArray(items) ? items : [],
    total: response?.total ?? (Array.isArray(items) ? items.length : 0),
    page: response?.page ?? params.page ?? 1,
    page_size: response?.page_size ?? params.page_size ?? params.limit ?? 100,
  };
}
