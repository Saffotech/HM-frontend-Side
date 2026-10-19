/**
 * Live /opd/notifications client (list, unread-count, mark read / read-all).
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

export async function getAdminNotifications(params = {}, token) {
  return apiClient(`/admin/notifications${buildQuery(params)}`, { token });
}

export async function getAdminNotificationsUnreadCount(token) {
  return apiClient('/admin/notifications/unread-count', { token });
}

export async function markAdminNotificationRead(notificationId, token) {
  return apiClient(`/admin/notifications/${notificationId}/read`, {
    method: 'PATCH',
    token,
  });
}

export async function markAllAdminNotificationsRead(token) {
  return apiClient('/admin/notifications/read-all', {
    method: 'PATCH',
    token,
  });
}
