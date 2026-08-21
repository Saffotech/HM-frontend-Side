import { useQuery } from '@tanstack/react-query';
import { getDoctorIpdAdmissions } from '@/features/doctor/api/ipd';
import { apiToUiAppointment } from '@/shared/api/mappers/appointmentMapper';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { DOCTOR_IPD_LIVE_QUERY_OPTIONS } from '@/features/doctor/utils/doctorDashboardCache';

/** Admitted (and other) IPD rows for one patient — not in GET /patients history until discharge. */
export function useDoctorIpdPatientAdmissionsQuery(patientUid, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  const uid = patientUid?.patientUid ?? patientUid;

  return useQuery({
    queryKey: queryKeys.doctor.ipd.admissions({
      scope: 'patient-profile',
      patientUid: uid,
      status: 'all',
    }),
    queryFn: async () => {
      const raw = await getDoctorIpdAdmissions(token, {
        search: uid,
        status: 'all',
        page: 1,
        page_size: 100,
      });
      return (raw?.items ?? [])
        .map(apiToUiAppointment)
        .filter((row) => row && row.patientUid === uid);
    },
    enabled: Boolean(token) && Boolean(uid) && enabled,
    ...DOCTOR_IPD_LIVE_QUERY_OPTIONS,
  });
}
