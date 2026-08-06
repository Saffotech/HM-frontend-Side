/**
 * Shared hospital reference data via IPD-gated endpoints.
 * Same payload shape as the OPD reference API, so OPD mappers are reused.
 */

import { apiClient } from '@/shared/api/client';
import {
  apiToUiDepartment,
  apiToUiDoctor,
} from '@/shared/api/services/opdReference';

export async function getIpdDepartments(token) {
  const rows = await apiClient('/ipd/reference/departments', { token });
  return (Array.isArray(rows) ? rows : []).map(apiToUiDepartment).filter(Boolean);
}

export async function getIpdDoctorsByDepartment(departmentId, token) {
  const response = await apiClient(`/ipd/reference/doctors/${departmentId}`, {
    token,
  });
  return (response?.doctors ?? []).map(apiToUiDoctor).filter(Boolean);
}
