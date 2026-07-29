import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminOpdSettings,
  saveAdminOpdSettings,
} from '@/shared/api/services/adminOpdSettings';
import { queryKeys } from '@/shared/api/queryKeys';

export function useAdminOpdSettingsQuery(options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.admin.opdSettings,
    enabled,
    queryFn: () => fetchAdminOpdSettings(),
  });
}

export function useUpdateAdminOpdSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (form) => saveAdminOpdSettings(form),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.admin.opdSettings, data);
      queryClient.invalidateQueries({ queryKey: queryKeys.opd.settings });
    },
  });
}
