import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorClinicalApi } from '@/shared/api/services';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';

export function useDoctorNotificationsQuery() {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.doctor.notifications,
    queryFn: () => doctorClinicalApi.listNotifications(token),
    retry: false,
  });
}

export function useUpdateRecordsMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updater) => doctorClinicalApi.mutateRecords(updater, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.doctor.records });
    },
    onError: mutationOnError,
  });
}

export function useUpdateNotificationsMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updater) => doctorClinicalApi.mutateNotifications(updater, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.doctor.notifications });
    },
  });
}
