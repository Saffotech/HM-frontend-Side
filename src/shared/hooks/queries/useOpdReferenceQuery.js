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

export function useLabRoutingDepartmentsQuery(options = {}) {
  const token = useQueryToken();
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.opd.labDepartments,
    queryFn: () => opdReferenceApi.listLabRoutingDepartments(token),
    enabled: Boolean(token) && enabled,
    staleTime: 1000 * 60 * 10,
    retry: false,
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
