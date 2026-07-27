import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorClinicalApi } from '@/shared/api/services';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';

export function useUpdateRecordsMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updater) => doctorClinicalApi.mutateRecords(updater, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.doctor.records });
    },
    onError: mutationOnError,
  });
}
