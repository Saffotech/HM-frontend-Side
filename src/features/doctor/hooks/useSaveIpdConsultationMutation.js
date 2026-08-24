import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';
import { finalizeIpdConsultationOnSave } from '@/features/doctor/utils/ipdConsultationSaveWorkflow';
import { invalidateDoctorIpdAdmissions } from '@/features/doctor/utils/doctorDashboardCache';
import { bumpDoctorIpdCache } from '@/shared/utils/doctorIpdSync';

export function useSaveIpdConsultationMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => finalizeIpdConsultationOnSave({ ...payload, token }),
    onSuccess: (_data, variables) => {
      invalidateDoctorIpdAdmissions(queryClient);
      bumpDoctorIpdCache();
      queryClient.invalidateQueries({ queryKey: ['doctor', 'ipd', 'nurse-visit-count'] });
      if (variables?.patientUid) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.doctor.patients.history(variables.patientUid),
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.doctor.labs });
      queryClient.invalidateQueries({ queryKey: queryKeys.doctor.prescriptions });
    },
    onError: mutationOnError,
  });
}
