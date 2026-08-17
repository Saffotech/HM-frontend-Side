import { useQuery, useQueryClient } from '@tanstack/react-query';

import { doctorPatientsApi } from '@/shared/api/services';

import { queryKeys } from '@/shared/api/queryKeys';

import { useQueryToken } from '@/shared/hooks/useQueryToken';

import {

  DOCTOR_PATIENT_HISTORY_QUERY_OPTIONS,

  DOCTOR_PATIENT_PRESCRIPTIONS_QUERY_OPTIONS,

  resolvePatientHistoryPlaceholder,

} from '@/features/doctor/utils/doctorPatientProfileCache';
import { DOCTOR_DASHBOARD_QUERY_OPTIONS } from '@/features/doctor/utils/doctorDashboardCache';



export function useDoctorPatientVisitsQuery(params = {}, options = {}) {

  const { enabled = true } = options;

  const token = useQueryToken();

  const queryParams = { limit: 100, ...params };

  return useQuery({

    queryKey: [...queryKeys.doctor.patients.visits, queryParams],

    queryFn: () => doctorPatientsApi.listPatientVisits(token, queryParams),

    enabled: Boolean(token) && enabled,

    ...DOCTOR_DASHBOARD_QUERY_OPTIONS,

  });

}



export function useDoctorPatientHistoryQuery(patientUhid, options = {}) {

  const { enabled = true, placeholderVisits } = options;

  const token = useQueryToken();

  const queryClient = useQueryClient();

  const uid = patientUhid?.patientUid ?? patientUhid;



  return useQuery({

    queryKey: queryKeys.doctor.patients.history(uid, { encounter_type: 'all' }),

    queryFn: () => doctorPatientsApi.fetchPatientHistory(uid, token, { encounter_type: 'all' }),

    enabled: Boolean(uid) && enabled,

    ...DOCTOR_PATIENT_HISTORY_QUERY_OPTIONS,

    placeholderData: (previousData) => {

      if (previousData) return previousData;

      return resolvePatientHistoryPlaceholder(queryClient, uid, placeholderVisits);

    },

  });

}



export function useDoctorPatientPrescriptionsQuery(patientId, options = {}) {

  const { enabled = true } = options;

  const token = useQueryToken();



  return useQuery({

    queryKey: queryKeys.doctor.patients.prescriptions(patientId),

    queryFn: () => doctorPatientsApi.fetchPatientPrescriptions(patientId, token),

    enabled:

      enabled &&

      patientId != null &&

      !Number.isNaN(Number(patientId)),

    ...DOCTOR_PATIENT_PRESCRIPTIONS_QUERY_OPTIONS,

  });

}


