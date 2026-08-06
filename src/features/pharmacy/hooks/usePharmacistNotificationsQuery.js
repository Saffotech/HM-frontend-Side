/**
 * Notifications hooks for live /pharmacy/notifications APIs.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPharmacistNotifications,
  getPharmacistNotificationsUnreadCount,
  markAllPharmacistNotificationsRead,
  markPharmacistNotificationRead,
} from '@/features/pharmacy/api/notifications';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';

const UNREAD_POLL_MS = 20000;
const LIST_QUERY_ROOT = ['pharmacy', 'notifications', 'list'];

export function isPharmacistNotificationRead(n) {
  if (n == null) return false;
  if (n.is_read === true || n.is_read === 1 || n.is_read === 'true' || n.is_read === '1') {
    return true;
  }
  if (n.read === true || n.read === 1 || n.read === 'true' || n.read === '1') return true;
  if (n.read_at) return true;
  return false;
}

export function isPharmacistNotificationUnread(n) {
  return !isPharmacistNotificationRead(n);
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
  queryClient.invalidateQueries({ queryKey: queryKeys.pharmacy.notifications });
  queryClient.invalidateQueries({
    queryKey: queryKeys.pharmacy.notificationsUnreadCount,
  });
}

export function usePharmacistNotificationsListQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.pharmacy.notificationsList(filters),
    queryFn: () => getPharmacistNotifications(filters, token),
    enabled: Boolean(token) && enabled,
    retry: false,
  });
}

export function usePharmacistNotificationsUnreadCountQuery(options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.pharmacy.notificationsUnreadCount,
    queryFn: async () => {
      const data = await getPharmacistNotificationsUnreadCount(token);
      return { count: data?.count ?? 0 };
    },
    enabled: Boolean(token) && enabled,
    refetchInterval: enabled ? UNREAD_POLL_MS : false,
    refetchOnWindowFocus: true,
    retry: false,
    select: (data) => data?.count ?? 0,
  });
}

export function useMarkPharmacistNotificationReadMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId) => markPharmacistNotificationRead(notificationId, token),
    onSuccess: (_data, notificationId) => {
      patchListCachesAsRead(queryClient, notificationId);
      invalidateNotificationQueries(queryClient);
    },
    onError: mutationOnError,
  });
}

export function useMarkAllPharmacistNotificationsReadMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllPharmacistNotificationsRead(token),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.pharmacy.notificationsUnreadCount, {
        count: 0,
      });
      patchAllListCachesAsRead(queryClient);
      invalidateNotificationQueries(queryClient);
    },
    onError: mutationOnError,
  });
}
