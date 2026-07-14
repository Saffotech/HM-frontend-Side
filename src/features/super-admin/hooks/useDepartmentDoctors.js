import { useMemo } from 'react';
import {
  useAdminRolesQuery,
  useAdminStaffListQuery,
} from '@/shared/hooks/queries/useAdminQuery';
import {
  buildDoctorCountByDepartment,
  findRoleIdByName,
} from '@/features/super-admin/utils/departmentDoctors';

const DOCTOR_FETCH_LIMIT = 100;

export function useDepartmentDoctorsData() {
  const rolesQuery = useAdminRolesQuery();
  const doctorRoleId = useMemo(
    () => findRoleIdByName(rolesQuery.data, 'doctor'),
    [rolesQuery.data],
  );

  const doctorsQuery = useAdminStaffListQuery(
    { role_id: doctorRoleId, limit: DOCTOR_FETCH_LIMIT, page: 1 },
    { enabled: Boolean(doctorRoleId) },
  );

  const doctors = doctorsQuery.data?.staff ?? [];

  const doctorCountByDepartment = useMemo(
    () => buildDoctorCountByDepartment(doctors),
    [doctors],
  );

  const isLoading = rolesQuery.isLoading || doctorsQuery.isLoading;
  const isError = rolesQuery.isError || doctorsQuery.isError;
  const error = rolesQuery.error || doctorsQuery.error;

  const refetch = () => {
    rolesQuery.refetch();
    doctorsQuery.refetch();
  };

  return {
    doctors,
    doctorCountByDepartment,
    isLoading,
    isError,
    error,
    refetch,
  };
}
