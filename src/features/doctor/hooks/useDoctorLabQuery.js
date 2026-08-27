import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorLabsApi } from '@/shared/api/services';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';
import { DOCTOR_DASHBOARD_QUERY_OPTIONS } from '@/features/doctor/utils/doctorDashboardCache';

export function useDoctorLabTestsQuery(params = {}, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  const apiParams = { limit: params.limit ?? 100, ...params };
  return useQuery({
    queryKey: [...queryKeys.doctor.labs, apiParams],
    queryFn: () => doctorLabsApi.fetchLabTests(token, apiParams),
    enabled: Boolean(token) && enabled,
    ...DOCTOR_DASHBOARD_QUERY_OPTIONS,
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

export function useDoctorLabReportQuery(testId, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.doctor.labReport(testId),
    queryFn: () => doctorLabsApi.fetchLabTestReport(testId, token),
    enabled: enabled && testId != null && Boolean(token),
    staleTime: 1000 * 60 * 2,
    retry: false,
  });
}

export function useDownloadDoctorLabReportFileMutation() {
  const token = useQueryToken();
  return useMutation({
    mutationFn: (testId) => doctorLabsApi.downloadLabTestReportFile(testId, token),
    onError: mutationOnError,
  });
}

/** Active lab catalog for new-order selectors (GET /lab-catalog?active=true). */
export function useLabCatalogQuery(params = {}, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  const apiParams = {
    active: params.active !== false,
    ...(params.department_id != null ? { department_id: params.department_id } : {}),
  };
  return useQuery({
    queryKey: queryKeys.doctor.labCatalog(apiParams),
    queryFn: () => doctorLabsApi.fetchLabCatalog(token, apiParams),
    enabled: Boolean(token) && enabled,
    // Keep fresh so newly added admin catalog tests appear in order dropdowns.
    staleTime: 1000 * 30,
    refetchOnMount: 'always',
    retry: false,
  });
}
