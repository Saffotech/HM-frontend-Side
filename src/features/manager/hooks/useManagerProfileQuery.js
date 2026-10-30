/**
 * TanStack Query hooks for Manager profile against live /manager/profile APIs.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteAdminProfileImage,
  getManagerProfile,
  updateAdminProfile,
  uploadAdminProfileImage,
} from '@/features/manager/api/profile';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';
import { syncAuthProfileAvatar } from '@/shared/utils/syncAuthProfileAvatar';

async function fetchAdminProfile(token) {
  const profile = await getManagerProfile(token);
  const data = { profile };
  syncAuthProfileAvatar(data);
  return data;
}

/* Legacy identifier preserved: useAdminProfileQuery. Active name: useManagerProfileQuery. */
export function useManagerProfileQuery() {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.admin.profile,
    queryFn: () => fetchAdminProfile(token),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useUpdateAdminProfileMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      await updateAdminProfile(payload, token);
      return fetchAdminProfile(token);
    },
    onSuccess: (data) => {
      syncAuthProfileAvatar(data);
      queryClient.setQueryData(queryKeys.admin.profile, data);
    },
    onError: mutationOnError,
  });
}

export function useUploadAdminProfileImageMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file) => {
      await uploadAdminProfileImage(file, token);
      return fetchAdminProfile(token);
    },
    onSuccess: (data) => {
      syncAuthProfileAvatar(data);
      queryClient.setQueryData(queryKeys.admin.profile, data);
    },
    onError: mutationOnError,
  });
}

export function useDeleteAdminProfileImageMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await deleteAdminProfileImage(token);
      return fetchAdminProfile(token);
    },
    onSuccess: (data) => {
      syncAuthProfileAvatar(data);
      queryClient.setQueryData(queryKeys.admin.profile, data);
    },
    onError: mutationOnError,
  });
}
