/** OPD reference data — departments and doctors */

import { apiClient } from '@/shared/api/client';

export async function getDepartments(token) {
  return apiClient('/opd/departments', { token });
}

export async function getDoctorsByDepartment(departmentId, token) {
  return apiClient(`/opd/doctors/department/${departmentId}`, { token });
}
