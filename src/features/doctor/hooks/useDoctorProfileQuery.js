/**
 * Doctor Phase 2 by Atharva —
 * TanStack Query hooks for GET/PUT profile + avatar against live /doctor/profile APIs.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteDoctorProfileImage,
  getDoctorProfile,
  updateDoctorProfile,
  uploadDoctorProfileImage,
} from '@/features/doctor/api/profile';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';

async function fetchDoctorProfile(token) {
  const profile = await getDoctorProfile(token);
  return { profile };
}

export function useDoctorProfileQuery() {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.doctor.profile,
    queryFn: () => fetchDoctorProfile(token),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useUpdateDoctorProfileMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      await updateDoctorProfile(payload, token);
      return fetchDoctorProfile(token);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.doctor.profile, data);
    },
    onError: mutationOnError,
  });
}

export function useUploadDoctorProfileImageMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file) => {
      await uploadDoctorProfileImage(file, token);
      return fetchDoctorProfile(token);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.doctor.profile, data);
    },
    onError: mutationOnError,
  });
}

export function useDeleteDoctorProfileImageMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await deleteDoctorProfileImage(token);
      return fetchDoctorProfile(token);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.doctor.profile, data);
    },
    onError: mutationOnError,
  });
}
