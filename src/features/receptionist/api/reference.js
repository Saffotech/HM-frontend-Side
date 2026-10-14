/**
 * Receptionist reference data for the pricing page.
 * Same payload shape as IPD/OPD reference APIs.
 */

import { apiClient } from '@/shared/api/client';
import {
  apiToUiDepartment,
  apiToUiDoctor,
} from '@/shared/api/services/opdReference';

export async function getReceptionistDepartments(token) {
  const rows = await apiClient('/receptionist/reference/departments', { token });
  return (Array.isArray(rows) ? rows : []).map(apiToUiDepartment).filter(Boolean);
}

export async function getReceptionistDoctorsByDepartment(departmentId, token) {
  const response = await apiClient(
    `/receptionist/reference/doctors/${departmentId}`,
    { token },
  );
  return (response?.doctors ?? []).map(apiToUiDoctor).filter(Boolean);
}
