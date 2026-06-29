/** Bed / ward API — used by features/opd/beds */

import { apiClient } from '@/shared/api/client';
import { formatOpdDisplayDateTime } from '@/shared/utils/opdDates';

export async function getBeds(token) {
  const response = await apiClient('/opd/beds', { token });
  return {
    beds: (response.beds ?? response).map(apiBedToUi),
    stats: response.stats ?? null,
  };
}

export async function getBedsByWard(wardName, token) {
  return apiClient(`/opd/beds/ward/${encodeURIComponent(wardName)}`, { token });
}

export async function assignBed(data, token) {
  const body = {
    bed_id: data.bed_id ?? data.bedId,
    patient_id: data.patient_id ?? data.patientId,
    department_id: data.department_id ?? data.departmentId,
  };
  return apiClient('/opd/beds/assign', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  });
}

export async function releaseBed(bedId, token) {
  return apiClient(`/opd/beds/${bedId}/release`, {
    method: 'POST',
    token,
  });
}

export async function getWards(token) {
  const response = await getBeds(token);
  const rows = response?.beds ?? (Array.isArray(response) ? response : []);
  const wards = [...new Set(rows.map((bed) => bed.ward_name ?? bed.ward).filter(Boolean))];
  return wards;
}

export function apiBedToUi(bed) {
  if (!bed) return null;
  return {
    bedNo: bed.bed_number ?? bed.bedNo,
    ward: bed.ward_name ?? bed.ward,
    status: bed.status
      ? bed.status.charAt(0).toUpperCase() + bed.status.slice(1)
      : bed.status,
    patientId: bed.patient_uid ?? bed.patient_id ?? bed.patientId,
    patientName: bed.patient_name ?? bed.patientName,
    department: bed.department_name ?? bed.department,
    admittedDate: formatOpdDisplayDateTime(bed.admitted_at ?? bed.admittedDate),
    dbId: bed.id ?? bed.dbId,
  };
}
