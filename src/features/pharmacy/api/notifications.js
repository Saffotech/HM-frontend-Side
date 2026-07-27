/**
 * Live /pharmacy/notifications client (list, unread-count, mark read / read-all).
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

export async function getPharmacistNotifications(params = {}, token) {
  return apiClient(`/pharmacy/notifications${buildQuery(params)}`, { token });
}

export async function getPharmacistNotificationsUnreadCount(token) {
  return apiClient('/pharmacy/notifications/unread-count', { token });
}

export async function markPharmacistNotificationRead(notificationId, token) {
  return apiClient(`/pharmacy/notifications/${notificationId}/read`, {
    method: 'PATCH',
    token,
  });
}

export async function markAllPharmacistNotificationsRead(token) {
  return apiClient('/pharmacy/notifications/read-all', {
    method: 'PATCH',
    token,
  });
}
