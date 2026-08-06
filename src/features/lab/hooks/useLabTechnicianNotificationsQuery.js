/**
 * Notifications hooks for lab technician against live /lab/notifications APIs.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getLabTechnicianNotifications,
  getLabTechnicianNotificationsUnreadCount,
  markAllLabTechnicianNotificationsRead,
  markLabTechnicianNotificationRead,
} from '@/features/lab/api/notifications';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';

const UNREAD_POLL_MS = 20000;
const LIST_QUERY_ROOT = ['lab', 'notifications', 'list'];

export function isLabTechnicianNotificationRead(n) {
  if (n == null) return false;
  if (n.is_read === true || n.is_read === 1 || n.is_read === 'true' || n.is_read === '1') {
    return true;
  }
  if (n.read === true || n.read === 1 || n.read === 'true' || n.read === '1') return true;
  if (n.read_at) return true;
  return false;
}

export function isLabTechnicianNotificationUnread(n) {
  return !isLabTechnicianNotificationRead(n);
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
  queryClient.invalidateQueries({ queryKey: queryKeys.lab.notifications });
  queryClient.invalidateQueries({ queryKey: queryKeys.lab.notificationsUnreadCount });
}

export function useLabTechnicianNotificationsListQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.lab.notificationsList(filters),
    queryFn: () => getLabTechnicianNotifications(filters, token),
    enabled: Boolean(token) && enabled,
    retry: false,
  });
}

export function useLabTechnicianNotificationsUnreadCountQuery(options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.lab.notificationsUnreadCount,
    queryFn: async () => {
      const data = await getLabTechnicianNotificationsUnreadCount(token);
      return { count: data?.count ?? 0 };
    },
    enabled: Boolean(token) && enabled,
    refetchInterval: enabled ? UNREAD_POLL_MS : false,
    refetchOnWindowFocus: true,
    retry: false,
    select: (data) => data?.count ?? 0,
  });
}

export function useMarkLabTechnicianNotificationReadMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId) => markLabTechnicianNotificationRead(notificationId, token),
    onSuccess: (_data, notificationId) => {
      patchListCachesAsRead(queryClient, notificationId);
      invalidateNotificationQueries(queryClient);
    },
    onError: mutationOnError,
  });
}

export function useMarkAllLabTechnicianNotificationsReadMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllLabTechnicianNotificationsRead(token),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.lab.notificationsUnreadCount, { count: 0 });
      patchAllListCachesAsRead(queryClient);
      invalidateNotificationQueries(queryClient);
    },
    onError: mutationOnError,
  });
}
