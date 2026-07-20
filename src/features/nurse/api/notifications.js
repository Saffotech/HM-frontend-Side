/**
 * Nurse Phase 2 by Atharva —
 * Real /nurse/notifications client (list, unread-count, mark read / read-all).
 */

import { apiClient } from '@/shared/api/client';

function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    // Nurse Phase 2 by Atharva — keep boolean false (is_read=false); do not skip falsy bools
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

export async function getNurseNotifications(params = {}, token) {
  return apiClient(`/nurse/notifications${buildQuery(params)}`, { token });
}

export async function getNurseNotificationsUnreadCount(token) {
  return apiClient('/nurse/notifications/unread-count', { token });
}

export async function markNurseNotificationRead(notificationId, token) {
  return apiClient(`/nurse/notifications/${notificationId}/read`, {
    method: 'PATCH',
    token,
  });
}

export async function markAllNurseNotificationsRead(token) {
  return apiClient('/nurse/notifications/read-all', {
    method: 'PATCH',
    token,
  });
}
