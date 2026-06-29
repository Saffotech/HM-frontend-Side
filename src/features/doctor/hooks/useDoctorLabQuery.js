import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorLabsApi } from '@/shared/api/services';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';

export function useDoctorLabTestsQuery(params = {}, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  const apiParams = { limit: params.limit ?? 100, ...params };
  return useQuery({
    queryKey: [...queryKeys.doctor.labs, apiParams],
    queryFn: () => doctorLabsApi.fetchLabTests(token, apiParams),
    enabled,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  });
}

export function useCreateLabTestMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => doctorLabsApi.addLabTest(payload, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.doctor.labs });
    },
    onError: mutationOnError,
  });
}

export function useUpdateLabTestMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ testId, payload }) => doctorLabsApi.patchLabTest(testId, payload, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.doctor.labs });
    },
    onError: mutationOnError,
  });
}

export function useCancelLabTestMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (testId) => doctorLabsApi.cancelLabTestById(testId, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.doctor.labs });
    },
    onError: mutationOnError,
  });
}
