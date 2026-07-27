/**
 * Notifications hooks for live /opd/notifications APIs.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAdminNotifications,
  getAdminNotificationsUnreadCount,
  markAllAdminNotificationsRead,
  markAdminNotificationRead,
} from '@/features/admin/api/notifications';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';

const UNREAD_POLL_MS = 20000;
const LIST_QUERY_ROOT = ['admin', 'notifications', 'list'];

export function isAdminNotificationRead(n) {
  if (n == null) return false;
  if (n.is_read === true || n.is_read === 1 || n.is_read === 'true' || n.is_read === '1') {
    return true;
  }
  if (n.read === true || n.read === 1 || n.read === 'true' || n.read === '1') return true;
  if (n.read_at) return true;
  return false;
}

export function isAdminNotificationUnread(n) {
  return !isAdminNotificationRead(n);
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
  queryClient.invalidateQueries({ queryKey: queryKeys.admin.notifications });
  queryClient.invalidateQueries({
    queryKey: queryKeys.admin.notificationsUnreadCount,
  });
}

export function useAdminNotificationsListQuery(filters = {}) {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.admin.notificationsList(filters),
    queryFn: () => getAdminNotifications(filters, token),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useAdminNotificationsUnreadCountQuery() {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.admin.notificationsUnreadCount,
    queryFn: async () => {
      const data = await getAdminNotificationsUnreadCount(token);
      return { count: data?.count ?? 0 };
    },
    enabled: Boolean(token),
    refetchInterval: UNREAD_POLL_MS,
    refetchOnWindowFocus: true,
    retry: false,
    select: (data) => data?.count ?? 0,
  });
}

export function useMarkAdminNotificationReadMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId) => markAdminNotificationRead(notificationId, token),
    onSuccess: (_data, notificationId) => {
      patchListCachesAsRead(queryClient, notificationId);
      invalidateNotificationQueries(queryClient);
    },
    onError: mutationOnError,
  });
}

export function useMarkAllAdminNotificationsReadMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllAdminNotificationsRead(token),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.admin.notificationsUnreadCount, {
        count: 0,
      });
      patchAllListCachesAsRead(queryClient);
      invalidateNotificationQueries(queryClient);
    },
    onError: mutationOnError,
  });
}
