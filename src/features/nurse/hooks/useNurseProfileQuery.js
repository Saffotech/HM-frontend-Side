/**
 * Nurse Phase 2 by Atharva —
 * TanStack Query hooks for GET/PUT profile + avatar against live /nurse/profile APIs.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteNurseProfileImage,
  getNurseProfile,
  updateNurseProfile,
  uploadNurseProfileImage,
} from '@/features/nurse/api/profile';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';

async function fetchNurseProfile(token) {
  const profile = await getNurseProfile(token);
  return { profile };
}

export function useNurseProfileQuery() {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.nurse.profile,
    queryFn: () => fetchNurseProfile(token),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useUpdateNurseProfileMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      await updateNurseProfile(payload, token);
      return fetchNurseProfile(token);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.nurse.profile, data);
    },
    onError: mutationOnError,
  });
}

export function useUploadNurseProfileImageMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file) => {
      await uploadNurseProfileImage(file, token);
      return fetchNurseProfile(token);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.nurse.profile, data);
    },
    onError: mutationOnError,
  });
}

export function useDeleteNurseProfileImageMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await deleteNurseProfileImage(token);
      return fetchNurseProfile(token);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.nurse.profile, data);
    },
    onError: mutationOnError,
  });
}
