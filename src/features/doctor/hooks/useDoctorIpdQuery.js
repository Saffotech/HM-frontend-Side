import { useQuery } from '@tanstack/react-query';
import { getDoctorIpdAdmissions } from '@/features/doctor/api/ipd';
import { apiToUiAppointment } from '@/shared/api/mappers/appointmentMapper';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { DOCTOR_IPD_LIVE_QUERY_OPTIONS } from '@/features/doctor/utils/doctorDashboardCache';

export function useDoctorIpdAdmissionsQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();

  return useQuery({
    queryKey: queryKeys.doctor.ipd.admissions(filters),
    queryFn: async () => {
      const raw = await getDoctorIpdAdmissions(token, filters);
      return {
        items: (raw?.items ?? []).map(apiToUiAppointment).filter(Boolean),
        total: raw?.total ?? 0,
        page: raw?.page ?? 1,
        page_size: raw?.page_size ?? filters.page_size ?? 20,
      };
    },
    enabled: Boolean(token) && enabled,
    ...DOCTOR_IPD_LIVE_QUERY_OPTIONS,
  });
}
