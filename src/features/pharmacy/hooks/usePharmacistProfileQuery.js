/**
 * TanStack Query hooks for pharmacist profile against live /pharmacy/profile APIs.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deletePharmacistProfileImage,
  getPharmacistProfile,
  updatePharmacistProfile,
  uploadPharmacistProfileImage,
} from '@/features/pharmacy/api/profile';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';
import { syncAuthProfileAvatar } from '@/shared/utils/syncAuthProfileAvatar';

async function fetchPharmacistProfile(token) {
  const profile = await getPharmacistProfile(token);
  const data = { profile };
  syncAuthProfileAvatar(data);
  return data;
}

export function usePharmacistProfileQuery() {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.pharmacy.profile,
    queryFn: () => fetchPharmacistProfile(token),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useUpdatePharmacistProfileMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      await updatePharmacistProfile(payload, token);
      return fetchPharmacistProfile(token);
    },
    onSuccess: (data) => {
      syncAuthProfileAvatar(data);
      queryClient.setQueryData(queryKeys.pharmacy.profile, data);
    },
    onError: mutationOnError,
  });
}

export function useUploadPharmacistProfileImageMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file) => {
      await uploadPharmacistProfileImage(file, token);
      return fetchPharmacistProfile(token);
    },
    onSuccess: (data) => {
      syncAuthProfileAvatar(data);
      queryClient.setQueryData(queryKeys.pharmacy.profile, data);
    },
    onError: mutationOnError,
  });
}

export function useDeletePharmacistProfileImageMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await deletePharmacistProfileImage(token);
      return fetchPharmacistProfile(token);
    },
    onSuccess: (data) => {
      syncAuthProfileAvatar(data);
      queryClient.setQueryData(queryKeys.pharmacy.profile, data);
    },
    onError: mutationOnError,
  });
}
