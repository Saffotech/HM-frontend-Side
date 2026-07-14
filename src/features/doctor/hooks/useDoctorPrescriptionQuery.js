import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorPrescriptionsApi } from '@/shared/api/services';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { toast } from '@/shared/utils/toast';
import { mutationOnError } from '@/shared/utils/mutationErrors';

function invalidatePrescriptionQueries(
  queryClient,
  patientId,
  patientUid,
  prescriptionId
) {
  queryClient.invalidateQueries({ queryKey: queryKeys.doctor.prescriptions });
  if (patientId != null) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.doctor.patients.prescriptions(patientId),
    });
  }
  if (patientUid) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.doctor.patients.history(patientUid),
    });
  }
  if (prescriptionId != null) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.doctor.prescriptionDetail(prescriptionId),
    });
  }
}

export function useCreatePrescriptionMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => doctorPrescriptionsApi.addPrescription(payload, token),
    onSuccess: (_data, variables) => {
      invalidatePrescriptionQueries(
        queryClient,
        variables?.patientId,
        variables?.patientUid,
        null
      );
    },
    onError: mutationOnError,
  });
}

/** GET /prescriptions/{id} — always fetch fresh detail from API. */
export function useDoctorPrescriptionDetailQuery(prescriptionId, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.doctor.prescriptionDetail(prescriptionId),
    queryFn: () => doctorPrescriptionsApi.fetchPrescriptionById(prescriptionId, token),
    enabled: enabled && prescriptionId != null,
  });
}

/** PUT update — requires prescriptions:update permission on backend */
export function useReplacePrescriptionMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) =>
      doctorPrescriptionsApi.replacePrescription(id, payload, token),
    onSuccess: (_data, variables) => {
      invalidatePrescriptionQueries(
        queryClient,
        variables?.payload?.patientId,
        variables?.payload?.patientUid,
        variables?.id
      );
    },
    onError: (err) => {
      toast.error(err?.message || 'Unable to update prescription');
    },
  });
}

export function useDeletePrescriptionMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => doctorPrescriptionsApi.removePrescription(id, token),
    onSuccess: (_data, variables) => {
      invalidatePrescriptionQueries(
        queryClient,
        variables?.patientId,
        variables?.patientUid,
        variables?.id
      );
    },
    onError: (err) => {
      toast.error(err?.message || 'Unable to delete prescription');
    },
  });
}
