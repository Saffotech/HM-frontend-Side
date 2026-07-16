/** Doctor patient / visit history API — root /patients paths (not OPD registry) */

import { apiClient } from "@/shared/api/client";
import { unwrapDoctorResponse } from "@/shared/api/utils/doctorResponseUtils";

export async function getPatients(token, params = {}) {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set('page', String(params.page));
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.search?.trim()) qs.set('search', params.search.trim());
  if (params.filter_date) qs.set('filter_date', params.filter_date);
  if (params.month != null) qs.set('month', String(params.month));
  if (params.year != null) qs.set('year', String(params.year));
  const query = qs.toString();
  const path = query ? `/patients?${query}` : '/patients';
  const response = await apiClient(path, { token });
  return {
    // Backend doctor patients list returns { items, total, page, page_size }.
    patients: unwrapDoctorResponse(response, 'items'),
    totalPatients:
      response?.total_patients ??
      response?.totalPatients ??
      response?.total ??
      0,
    page: response?.page,
    limit: response?.limit ?? response?.page_size,
  };
}

export async function getPatientHistory(patientUhid, token) {
  const response = await apiClient(
    `/patients/${encodeURIComponent(patientUhid)}`,
    { token },
  );
  return unwrapDoctorResponse(response, "patient_history");
}
