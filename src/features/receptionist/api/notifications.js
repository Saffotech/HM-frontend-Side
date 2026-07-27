/**
 * Live /receptionist/notifications client (list, unread-count, mark read / read-all).
 */

import { apiClient } from '@/shared/api/client';

function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (typeof value === 'boolean') {
      search.set(key, value ? 'true' : 'false');
      return;
    }
    search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export async function getReceptionistNotifications(params = {}, token) {
  return apiClient(`/receptionist/notifications${buildQuery(params)}`, { token });
}

export async function getReceptionistNotificationsUnreadCount(token) {
  return apiClient('/receptionist/notifications/unread-count', { token });
}

export async function markReceptionistNotificationRead(notificationId, token) {
  return apiClient(`/receptionist/notifications/${notificationId}/read`, {
    method: 'PATCH',
    token,
  });
}

export async function markAllReceptionistNotificationsRead(token) {
  return apiClient('/receptionist/notifications/read-all', {
    method: 'PATCH',
    token,
  });
}
