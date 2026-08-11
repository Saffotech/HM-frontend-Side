/** Bed API — list/map helpers used by dashboard and admin bed queries */

import { apiClient } from '@/shared/api/client';
import { buildQueryString } from '@/shared/utils/buildQueryString';
import { formatOpdDisplayDateTime } from '@/shared/utils/opdDates';

export async function getBeds(token, params = {}) {
  const query = buildQueryString({
    ward: params.ward,
    status: params.status,
    search: params.search,
  });
  const response = await apiClient(`/opd/beds${query}`, { token });
  return {
    beds: (response.beds ?? response).map(apiBedToUi),
    stats: response.stats ?? null,
  };
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
    departmentId: bed.department_id ?? bed.departmentId ?? null,
    admittedDate: formatOpdDisplayDateTime(bed.admitted_at ?? bed.admittedDate),
    dbId: bed.id ?? bed.dbId,
  };
}
