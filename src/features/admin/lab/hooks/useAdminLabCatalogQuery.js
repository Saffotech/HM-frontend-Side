import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminLabCatalogTest,
  getAdminLabCatalog,
  setAdminLabCatalogActive,
  updateAdminLabCatalogTest,
} from '@/features/admin/lab/api/labCatalog';
import {
  apiToUiLabCatalogTest,
  mapLabCatalogList,
} from '@/shared/api/mappers/labCatalogMapper';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { toast } from '@/shared/utils/toast';

function mutationOnError(error) {
  toast.error(error?.message || 'Request failed');
}

function invalidateLabCatalog(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['admin', 'lab-catalog'] });
  queryClient.invalidateQueries({ queryKey: ['doctor', 'lab-catalog'] });
}

export function useAdminLabCatalogQuery(params = {}, options = {}) {
  const token = useQueryToken();
  const { enabled = true } = options;
  const apiParams = {
    ...(params.active != null ? { active: params.active } : {}),
    ...(params.department_id != null && params.department_id !== ''
      ? { department_id: params.department_id }
      : {}),
  };

  return useQuery({
    queryKey: queryKeys.admin.labCatalog(apiParams),
    queryFn: async () => mapLabCatalogList(await getAdminLabCatalog(token, apiParams)),
    enabled: Boolean(token) && enabled,
    staleTime: 1000 * 15,
    refetchOnMount: 'always',
  });
}

export function useCreateAdminLabCatalogMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) =>
      apiToUiLabCatalogTest(await createAdminLabCatalogTest(payload, token)),
    onSuccess: () => invalidateLabCatalog(queryClient),
    onError: mutationOnError,
  });
}

export function useUpdateAdminLabCatalogMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ testId, payload }) =>
      apiToUiLabCatalogTest(await updateAdminLabCatalogTest(testId, payload, token)),
    onSuccess: () => invalidateLabCatalog(queryClient),
    onError: mutationOnError,
  });
}

export function useActivateAdminLabCatalogMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ testId, active }) =>
      apiToUiLabCatalogTest(await setAdminLabCatalogActive(testId, active, token)),
    onSuccess: () => invalidateLabCatalog(queryClient),
    onError: mutationOnError,
  });
}
