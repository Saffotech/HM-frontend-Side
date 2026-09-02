/**
 * TanStack Query hooks for Hospital Admin profile against live /admin/profile APIs.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteAdminProfileImage,
  getAdminProfile,
  updateAdminProfile,
  uploadAdminProfileImage,
} from '@/features/admin/api/profile';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';
import { syncAuthProfileAvatar } from '@/shared/utils/syncAuthProfileAvatar';

async function fetchAdminProfile(token) {
  const profile = await getAdminProfile(token);
  const data = { profile };
  syncAuthProfileAvatar(data);
  return data;
}

export function useAdminProfileQuery() {
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
