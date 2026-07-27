/**
 * TanStack Query hooks for receptionist profile against live /receptionist/profile APIs.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteReceptionistProfileImage,
  getReceptionistProfile,
  updateReceptionistProfile,
  uploadReceptionistProfileImage,
} from '@/features/receptionist/api/profile';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';
import { syncAuthProfileAvatar } from '@/shared/utils/syncAuthProfileAvatar';

async function fetchReceptionistProfile(token) {
  const profile = await getReceptionistProfile(token);
  const data = { profile };
  syncAuthProfileAvatar(data);
  return data;
}

export function useReceptionistProfileQuery() {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.receptionist.profile,
    queryFn: () => fetchReceptionistProfile(token),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useUpdateReceptionistProfileMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      await updateReceptionistProfile(payload, token);
      return fetchReceptionistProfile(token);
    },
    onSuccess: (data) => {
      syncAuthProfileAvatar(data);
      queryClient.setQueryData(queryKeys.receptionist.profile, data);
    },
    onError: mutationOnError,
  });
}

export function useUploadReceptionistProfileImageMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file) => {
      await uploadReceptionistProfileImage(file, token);
      return fetchReceptionistProfile(token);
    },
    onSuccess: (data) => {
      syncAuthProfileAvatar(data);
      queryClient.setQueryData(queryKeys.receptionist.profile, data);
    },
    onError: mutationOnError,
  });
}

export function useDeleteReceptionistProfileImageMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await deleteReceptionistProfileImage(token);
      return fetchReceptionistProfile(token);
    },
    onSuccess: (data) => {
      syncAuthProfileAvatar(data);
      queryClient.setQueryData(queryKeys.receptionist.profile, data);
    },
    onError: mutationOnError,
  });
}
