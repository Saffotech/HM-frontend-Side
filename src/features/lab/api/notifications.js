/**
 * Live /lab/notifications client (list, unread-count, mark read / read-all).
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

export async function getLabTechnicianNotifications(params = {}, token) {
  return apiClient(`/lab/notifications${buildQuery(params)}`, { token });
}

export async function getLabTechnicianNotificationsUnreadCount(token) {
  return apiClient('/lab/notifications/unread-count', { token });
}

export async function markLabTechnicianNotificationRead(notificationId, token) {
  return apiClient(`/lab/notifications/${notificationId}/read`, {
    method: 'PATCH',
    token,
  });
}

export async function markAllLabTechnicianNotificationsRead(token) {
  return apiClient('/lab/notifications/read-all', {
    method: 'PATCH',
    token,
  });
}

export function buildLabTechnicianNotificationsQuery(params = {}) {
  return buildQuery(params);
}
