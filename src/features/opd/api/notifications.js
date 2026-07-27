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

export async function getOpdBillingNotifications(params = {}, token) {
  return apiClient(`/opd/notifications${buildQuery(params)}`, { token });
}

export async function getOpdBillingNotificationsUnreadCount(token) {
  return apiClient('/opd/notifications/unread-count', { token });
}

export async function markOpdBillingNotificationRead(notificationId, token) {
  return apiClient(`/opd/notifications/${notificationId}/read`, {
    method: 'PATCH',
    token,
  });
}

export async function markAllOpdBillingNotificationsRead(token) {
  return apiClient('/opd/notifications/read-all', {
    method: 'PATCH',
    token,
  });
}
