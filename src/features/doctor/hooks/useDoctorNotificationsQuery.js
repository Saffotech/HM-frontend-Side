/**
 * Doctor Phase 2 by Atharva —
 * Notifications hooks for live /doctor/notifications APIs.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getDoctorNotifications,
  getDoctorNotificationsUnreadCount,
  markAllDoctorNotificationsRead,
  markDoctorNotificationRead,
} from '@/features/doctor/api/notifications';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';

const UNREAD_POLL_MS = 20000;
const LIST_QUERY_ROOT = ['doctor', 'notifications', 'list'];

/** Normalize read flag across API shapes */
export function isDoctorNotificationRead(n) {
  if (n == null) return false;
  if (n.is_read === true || n.is_read === 1 || n.is_read === 'true' || n.is_read === '1') {
    return true;
  }
  if (n.read === true || n.read === 1 || n.read === 'true' || n.read === '1') return true;
  if (n.read_at) return true;
  return false;
}

export function isDoctorNotificationUnread(n) {
  return !isDoctorNotificationRead(n);
}

function patchListCachesAsRead(queryClient, notificationId) {
  const id = Number(notificationId);
  const now = new Date().toISOString();
  queryClient.setQueriesData({ queryKey: LIST_QUERY_ROOT }, (old) => {
    if (!old?.items) return old;
    return {
      ...old,
      items: old.items.map((n) =>
        Number(n.id) === id ? { ...n, is_read: true, read_at: n.read_at || now } : n
      ),
    };
  });
}

function patchAllListCachesAsRead(queryClient) {
  const now = new Date().toISOString();
  queryClient.setQueriesData({ queryKey: LIST_QUERY_ROOT }, (old) => {
    if (!old?.items) return old;
    return {
      ...old,
      items: old.items.map((n) => ({
        ...n,
        is_read: true,
        read_at: n.read_at || now,
      })),
    };
  });
}

function invalidateNotificationQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.doctor.notifications });
  queryClient.invalidateQueries({ queryKey: queryKeys.doctor.notificationsUnreadCount });
}

export function useDoctorNotificationsListQuery(filters = {}) {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.doctor.notificationsList(filters),
    queryFn: () => getDoctorNotifications(filters, token),
    enabled: Boolean(token),
    retry: false,
  });
}

/**
 * Poll unread-count every 20s for the nav badge (no WebSocket on backend).
 */
export function useDoctorNotificationsUnreadCountQuery() {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.doctor.notificationsUnreadCount,
    queryFn: async () => {
      const data = await getDoctorNotificationsUnreadCount(token);
      return { count: data?.count ?? 0 };
    },
    enabled: Boolean(token),
    refetchInterval: UNREAD_POLL_MS,
    refetchOnWindowFocus: true,
    retry: false,
    select: (data) => data?.count ?? 0,
  });
}

export function useMarkDoctorNotificationReadMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId) => markDoctorNotificationRead(notificationId, token),
    onSuccess: (_data, notificationId) => {
      patchListCachesAsRead(queryClient, notificationId);
      invalidateNotificationQueries(queryClient);
    },
    onError: mutationOnError,
  });
}

export function useMarkAllDoctorNotificationsReadMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllDoctorNotificationsRead(token),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.doctor.notificationsUnreadCount, { count: 0 });
      patchAllListCachesAsRead(queryClient);
      invalidateNotificationQueries(queryClient);
    },
    onError: mutationOnError,
  });
}
