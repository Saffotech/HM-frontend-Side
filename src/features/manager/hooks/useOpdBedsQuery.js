import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  activateInventoryBed,
  activateInventoryWard,
  createInventoryBed,
  createInventoryBedsBulk,
  deleteInventoryBed,
  deleteInventoryWard,
  getBedInventorySummary,
  listInventoryBeds,
  updateInventoryBed,
} from '@/features/manager/api/opdBeds';
import { queryKeys } from '@/shared/api/queryKeys';
import { mergeBedTypes } from '@/shared/utils/bedTypeOverlay';

const inventoryKey = ['admin', 'opd-bed-inventory'];

function invalidateBedEverywhere(queryClient) {
  queryClient.invalidateQueries({ queryKey: inventoryKey });
  queryClient.invalidateQueries({ queryKey: queryKeys.beds.all });
  queryClient.invalidateQueries({ queryKey: ['beds', 'list'] });
  queryClient.invalidateQueries({ queryKey: queryKeys.opd.dashboard });
  queryClient.invalidateQueries({ queryKey: queryKeys.nurse.all });
}

export function useBedInventorySummaryQuery(options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: [...inventoryKey, 'summary'],
    queryFn: getBedInventorySummary,
    enabled,
  });
}

export function useBedInventoryListQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: [...inventoryKey, 'list', filters],
    queryFn: () => listInventoryBeds(filters),
    enabled,
    select: (data) => ({
      ...data,
      beds: mergeBedTypes(data?.beds ?? []),
    }),
  });
}

export function useCreateInventoryBedMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInventoryBed,
    onSuccess: () => invalidateBedEverywhere(queryClient),
  });
}

export function useCreateInventoryBedsBulkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInventoryBedsBulk,
    onSuccess: () => invalidateBedEverywhere(queryClient),
  });
}

export function useUpdateInventoryBedMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bedId, body }) => updateInventoryBed(bedId, body),
    onSuccess: () => invalidateBedEverywhere(queryClient),
  });
}

export function useDeleteInventoryBedMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteInventoryBed,
    onSuccess: () => invalidateBedEverywhere(queryClient),
  });
}

export function useDeleteInventoryWardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteInventoryWard,
    onSuccess: () => invalidateBedEverywhere(queryClient),
  });
}

export function useActivateInventoryBedMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: activateInventoryBed,
    onSuccess: () => invalidateBedEverywhere(queryClient),
  });
}

export function useActivateInventoryWardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: activateInventoryWard,
    onSuccess: () => invalidateBedEverywhere(queryClient),
  });
}
