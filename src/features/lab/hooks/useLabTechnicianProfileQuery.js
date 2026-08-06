/**
 * TanStack Query hooks for lab technician profile against live /lab/profile APIs.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteLabTechnicianProfileImage,
  getLabTechnicianProfile,
  updateLabTechnicianProfile,
  uploadLabTechnicianProfileImage,
} from '@/features/lab/api/profile';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';
import { syncAuthProfileAvatar } from '@/shared/utils/syncAuthProfileAvatar';

async function fetchLabTechnicianProfile(token) {
  const profile = await getLabTechnicianProfile(token);
  const data = { profile };
  syncAuthProfileAvatar(data);
  return data;
}

export function useLabTechnicianProfileQuery(options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.lab.profile,
    queryFn: () => fetchLabTechnicianProfile(token),
    enabled: Boolean(token) && enabled,
    retry: false,
  });
}

export function useUpdateLabTechnicianProfileMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      await updateLabTechnicianProfile(payload, token);
      return fetchLabTechnicianProfile(token);
    },
    onSuccess: (data) => {
      syncAuthProfileAvatar(data);
      queryClient.setQueryData(queryKeys.lab.profile, data);
    },
    onError: mutationOnError,
  });
}

export function useUploadLabTechnicianProfileImageMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file) => {
      await uploadLabTechnicianProfileImage(file, token);
      return fetchLabTechnicianProfile(token);
    },
    onSuccess: (data) => {
      syncAuthProfileAvatar(data);
      queryClient.setQueryData(queryKeys.lab.profile, data);
    },
    onError: mutationOnError,
  });
}

export function useDeleteLabTechnicianProfileImageMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await deleteLabTechnicianProfileImage(token);
      return fetchLabTechnicianProfile(token);
    },
    onSuccess: (data) => {
      syncAuthProfileAvatar(data);
      queryClient.setQueryData(queryKeys.lab.profile, data);
    },
    onError: mutationOnError,
  });
}
