import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { bedsApi } from '@/shared/api/services';

import { queryKeys } from '@/shared/api/queryKeys';

import { useQueryToken } from '@/shared/hooks/useQueryToken';

import { mutationOnError } from '@/shared/utils/mutationErrors';

function normalizeBedStatusFilter(status) {
  if (!status || status === 'All') return undefined;
  return String(status).toLowerCase();
}

function normalizeBedWardFilter(ward) {
  if (!ward || ward === 'All') return undefined;
  return ward;
}

export function useBedsByWardQuery(wardName, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.beds.ward(wardName),
    enabled: enabled && Boolean(wardName),
    queryFn: () => bedsApi.listBedsByWard(wardName, token),
  });
}

export function useBedsQuery(options = {}) {
  const {
    enabled = true,
    ward,
    status,
    search,
  } = options;
  const token = useQueryToken();
  const filters = {
    ward: normalizeBedWardFilter(ward),
    status: normalizeBedStatusFilter(status),
    search: search?.trim() || undefined,
  };

  return useQuery({
    queryKey: queryKeys.beds.list(filters),
    enabled,
    queryFn: () => bedsApi.listBeds(token, filters),
  });
}

export function useAssignBedMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => bedsApi.assignBedToPatient(payload, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.beds.all });
      queryClient.invalidateQueries({ queryKey: ['beds', 'list'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.nurse.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.opd.dashboard });
    },
    onError: mutationOnError,
  });
}

export function useReleaseBedMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bedId) => bedsApi.releaseBedById(bedId, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.beds.all });
      queryClient.invalidateQueries({ queryKey: ['beds', 'list'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.nurse.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.opd.dashboard });
    },
    onError: mutationOnError,
  });
}
