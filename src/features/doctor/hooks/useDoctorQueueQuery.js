import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorQueueApi, doctorConsultationsApi } from '@/shared/api/services';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';
import { finalizeConsultationOnSave } from '@/features/doctor/utils/consultationSaveWorkflow';
import {
  DOCTOR_DASHBOARD_QUERY_OPTIONS,
  invalidateDoctorDashboardCore,
  invalidateDoctorDashboardAfterComplete,
} from '@/features/doctor/utils/doctorDashboardCache';
import { selectDashboardQueue } from '@/features/doctor/utils/doctorDashboardSelectors';

export function useDoctorTodayQueueQuery() {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.doctor.queue.today,
    queryFn: () => doctorQueueApi.fetchTodayQueue(token),
    ...DOCTOR_DASHBOARD_QUERY_OPTIONS,
  });
}

/** Dashboard observer — same cache key, slim queue projection. */
export function useDoctorDashboardTodayQueueQuery() {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.doctor.queue.today,
    queryFn: () => doctorQueueApi.fetchTodayQueue(token),
    select: selectDashboardQueue,
    ...DOCTOR_DASHBOARD_QUERY_OPTIONS,
  });
}

export function useDoctorCurrentQueueQuery() {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.doctor.queue.current,
    queryFn: () => doctorQueueApi.fetchCurrentQueue(token),
  });
}

export function useAddToQueueMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId) => doctorQueueApi.enqueueAppointment(appointmentId, token),
    onSuccess: () => invalidateDoctorDashboardCore(queryClient),
    onError: mutationOnError,
  });
}

export function useStartConsultationMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (queueId) => doctorQueueApi.beginQueueConsultation(queueId, token),
    onSuccess: () => invalidateDoctorDashboardCore(queryClient),
    onError: mutationOnError,
  });
}

export function useConsultationContextQuery(appointmentDbId, { enabled = true } = {}) {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.doctor.consultations.context(appointmentDbId),
    queryFn: () => doctorConsultationsApi.fetchConsultationContext(appointmentDbId, token),
    enabled: enabled && appointmentDbId != null && Boolean(token),
    ...DOCTOR_DASHBOARD_QUERY_OPTIONS,
  });
}

export function useSaveConsultationWorkflowMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ appointmentDbId, clinical }) =>
      finalizeConsultationOnSave({
        appointmentDbId,
        token,
        clinical,
      }),
    onSuccess: (_data, variables) => {
      if (variables?.appointmentDbId != null) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.doctor.consultations.context(variables.appointmentDbId),
        });
      }
      invalidateDoctorDashboardAfterComplete(queryClient, {
        patientUid: variables?.patientUid,
        patientId: variables?.patientId,
      });
    },
    onError: mutationOnError,
  });
}

export function useCompleteConsultationMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ queueId, clinical }) =>
      doctorQueueApi.finishQueueConsultation(queueId, token, clinical),
    onSuccess: (_data, variables) => {
      invalidateDoctorDashboardAfterComplete(queryClient, {
        patientUid: variables?.patientUid,
        patientId: variables?.patientId,
      });
    },
    onError: mutationOnError,
  });
}

export function useRequestNextPatientMutation() {
  const token = useQueryToken();
  return useMutation({
    mutationFn: (appointmentId) => doctorQueueApi.notifyNextPatient(appointmentId, token),
    onError: mutationOnError,
  });
}
