/** Doctor IPD admissions — GET /doctor/ipd-admissions (appointments:view). */

import { apiClient } from '@/shared/api/client';

export async function getDoctorIpdAdmissions(token, params = {}) {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set('page', String(params.page));
  if (params.page_size != null) qs.set('page_size', String(params.page_size));
  if (params.status) qs.set('status', params.status);
  if (params.from_date) qs.set('from_date', params.from_date);
  if (params.to_date) qs.set('to_date', params.to_date);
  if (params.search?.trim()) qs.set('search', params.search.trim());
  const q = qs.toString();
  return apiClient(q ? `/doctor/ipd-admissions?${q}` : '/doctor/ipd-admissions', { token });
}

export async function recordIpdDoctorVisit(admissionId, body, token) {
  return apiClient(`/ipd/admissions/${admissionId}/visits`, {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  });
}

export async function patchIpdAdmissionClinical(admissionId, body, token) {
  return apiClient(`/ipd/admissions/${admissionId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
    token,
  });
}
