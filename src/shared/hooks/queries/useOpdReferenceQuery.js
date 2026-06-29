import { useQuery } from '@tanstack/react-query';
import { opdReferenceApi } from '@/shared/api/services';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';

export function useDepartmentsQuery() {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.opd.departments,
    queryFn: () => opdReferenceApi.listDepartments(token),
  });
}

export function useDoctorsByDepartmentQuery(departmentId) {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.opd.doctors(departmentId),
    queryFn: () => opdReferenceApi.listDoctorsByDepartment(departmentId, token),
    enabled: Boolean(departmentId),
  });
}
