import { useQuery } from '@tanstack/react-query';
import { opdReferenceApi, doctorLabsApi } from '@/shared/api/services';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { labRoutingDepartmentsFromCatalog } from '@/features/doctor/utils/labCatalogOptions';

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
    queryFn: async () => {
      try {
        return await opdReferenceApi.listLabRoutingDepartments(token);
      } catch (err) {
        // Doctors have lab:view / lab_catalog:view but usually not opd:view.
        if (err?.status !== 403) throw err;
        const catalog = await doctorLabsApi.fetchLabCatalog(token, { active: true });
        return labRoutingDepartmentsFromCatalog(catalog);
      }
    },
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
