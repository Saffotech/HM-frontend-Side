import { useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { getDoctorIpdAdmissions } from '@/features/doctor/api/ipd';
import { apiToUiAppointment } from '@/shared/api/mappers/appointmentMapper';
import { doctorPatientsApi } from '@/shared/api/services';
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

/**
 * Build a Map of patientDbId/patientUid -> visit count for the given IPD rows.
 * Uses GET /doctor/patient-visits (doctor_patient_visits:view) per unique patient.
 */
export function useIpdPatientVisitCounts(rows = []) {
  const token = useQueryToken();

  const uniquePatients = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      const dbId = row.patientDbId;
      const uid = row.patientUid;
      if (dbId == null && !uid) continue;
      const key = dbId ?? uid;
      if (!map.has(key)) map.set(key, { patientId: dbId, patientUid: uid });
    }
    return [...map.values()];
  }, [rows]);

  const results = useQueries({
    queries: uniquePatients.map(({ patientId, patientUid }) => {
      const params = {};
      if (patientId != null && !Number.isNaN(Number(patientId))) {
        params.patient_id = Number(patientId);
      }
      if (patientUid) params.patient_uid = patientUid;
      return {
        queryKey: queryKeys.doctor.patients.patientVisits(params),
        queryFn: () => doctorPatientsApi.fetchDoctorPatientVisits(token, params),
        enabled:
          Boolean(token) &&
          (params.patient_id != null || Boolean(params.patient_uid)),
        staleTime: 30 * 1000,
      };
    }),
  });

  return useMemo(() => {
    const map = new Map();
    uniquePatients.forEach(({ patientId, patientUid }, index) => {
      const count = results[index]?.data?.visit_count ?? 0;
      const key = patientId ?? patientUid;
      if (key != null) map.set(key, count);
    });
    return map;
  }, [uniquePatients, results]);
}
