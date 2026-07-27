/**
 * TanStack Query hooks for Super Admin profile against /super-admin/profile APIs.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteSuperAdminProfileImage,
  getSuperAdminProfile,
  updateSuperAdminProfile,
  uploadSuperAdminProfileImage,
} from '@/features/super-admin/api/profile';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';
import { syncAuthProfileAvatar } from '@/shared/utils/syncAuthProfileAvatar';

async function fetchSuperAdminProfile(token) {
  const profile = await getSuperAdminProfile(token);
  const data = { profile };
  syncAuthProfileAvatar(data);
  return data;
}

export function useSuperAdminProfileQuery() {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.superAdmin.profile,
    queryFn: () => fetchSuperAdminProfile(token),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useUpdateSuperAdminProfileMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      await updateSuperAdminProfile(payload, token);
      return fetchSuperAdminProfile(token);
    },
    onSuccess: (data) => {
      syncAuthProfileAvatar(data);
      queryClient.setQueryData(queryKeys.superAdmin.profile, data);
    },
    onError: mutationOnError,
  });
}

export function useUploadSuperAdminProfileImageMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file) => {
      await uploadSuperAdminProfileImage(file, token);
      return fetchSuperAdminProfile(token);
    },
    onSuccess: (data) => {
      syncAuthProfileAvatar(data);
      queryClient.setQueryData(queryKeys.superAdmin.profile, data);
    },
    onError: mutationOnError,
  });
}

export function useDeleteSuperAdminProfileImageMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await deleteSuperAdminProfileImage(token);
      return fetchSuperAdminProfile(token);
    },
    onSuccess: (data) => {
      syncAuthProfileAvatar(data);
      queryClient.setQueryData(queryKeys.superAdmin.profile, data);
    },
    onError: mutationOnError,
  });
}
