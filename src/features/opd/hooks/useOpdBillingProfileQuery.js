/**
 * TanStack Query hooks for OPD Billing profile against live /opd/profile APIs.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteOpdBillingProfileImage,
  getOpdBillingProfile,
  updateOpdBillingProfile,
  uploadOpdBillingProfileImage,
} from '@/features/opd/api/profile';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';
import { syncAuthProfileAvatar } from '@/shared/utils/syncAuthProfileAvatar';

async function fetchOpdBillingProfile(token) {
  const profile = await getOpdBillingProfile(token);
  const data = { profile };
  syncAuthProfileAvatar(data);
  return data;
}

export function useOpdBillingProfileQuery() {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.opd.profile,
    queryFn: () => fetchOpdBillingProfile(token),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useUpdateOpdBillingProfileMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      await updateOpdBillingProfile(payload, token);
      return fetchOpdBillingProfile(token);
    },
    onSuccess: (data) => {
      syncAuthProfileAvatar(data);
      queryClient.setQueryData(queryKeys.opd.profile, data);
    },
    onError: mutationOnError,
  });
}

export function useUploadOpdBillingProfileImageMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file) => {
      await uploadOpdBillingProfileImage(file, token);
      return fetchOpdBillingProfile(token);
    },
    onSuccess: (data) => {
      syncAuthProfileAvatar(data);
      queryClient.setQueryData(queryKeys.opd.profile, data);
    },
    onError: mutationOnError,
  });
}

export function useDeleteOpdBillingProfileImageMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await deleteOpdBillingProfileImage(token);
      return fetchOpdBillingProfile(token);
    },
    onSuccess: (data) => {
      syncAuthProfileAvatar(data);
      queryClient.setQueryData(queryKeys.opd.profile, data);
    },
    onError: mutationOnError,
  });
}
