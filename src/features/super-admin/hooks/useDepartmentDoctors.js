import { useMemo } from 'react';
import {
  useAdminRolesQuery,
  useAdminStaffListQuery,
} from '@/shared/hooks/queries/useAdminQuery';
import {
  buildDoctorCountByDepartment,
  findRoleIdByName,
} from '@/features/super-admin/utils/departmentDoctors';

const STAFF_FETCH_LIMIT = 100;

export function useDepartmentDoctorsData() {
  const rolesQuery = useAdminRolesQuery();
  const doctorRoleId = useMemo(
    () => findRoleIdByName(rolesQuery.data, 'doctor'),
    [rolesQuery.data],
  );
  const labTechRoleId = useMemo(
    () => findRoleIdByName(rolesQuery.data, 'lab_technician'),
    [rolesQuery.data],
  );

  const doctorsQuery = useAdminStaffListQuery(
    { role_id: doctorRoleId, limit: STAFF_FETCH_LIMIT, page: 1 },
    { enabled: Boolean(doctorRoleId) },
  );
  const labTechsQuery = useAdminStaffListQuery(
    { role_id: labTechRoleId, limit: STAFF_FETCH_LIMIT, page: 1 },
    { enabled: Boolean(labTechRoleId) },
  );

  const doctors = doctorsQuery.data?.staff ?? [];
  const labTechnicians = labTechsQuery.data?.staff ?? [];

  const doctorCountByDepartment = useMemo(
    () => buildDoctorCountByDepartment(doctors),
    [doctors],
  );
  const labTechCountByDepartment = useMemo(
    () => buildDoctorCountByDepartment(labTechnicians),
    [labTechnicians],
  );

  const isLoading =
    rolesQuery.isLoading || doctorsQuery.isLoading || labTechsQuery.isLoading;
  const isError = rolesQuery.isError || doctorsQuery.isError || labTechsQuery.isError;
  const error = rolesQuery.error || doctorsQuery.error || labTechsQuery.error;

  const refetch = () => {
    rolesQuery.refetch();
    doctorsQuery.refetch();
    labTechsQuery.refetch();
  };

  return {
    doctors,
    labTechnicians,
    doctorCountByDepartment,
    labTechCountByDepartment,
    isLoading,
    isError,
    error,
    refetch,
  };
}
