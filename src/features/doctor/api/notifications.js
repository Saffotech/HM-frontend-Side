/**
 * Doctor Phase 2 by Atharva —
 * Real /doctor/notifications client (list, unread-count, mark read / read-all).
 * Replaces clinical stub usage for the doctor bell and inbox.
 */

import { apiClient } from '@/shared/api/client';

function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    // Doctor Phase 2 by Atharva — keep boolean false (is_read=false); do not skip falsy bools
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

export async function getDoctorNotifications(params = {}, token) {
  return apiClient(`/doctor/notifications${buildQuery(params)}`, { token });
}

export async function getDoctorNotificationsUnreadCount(token) {
  return apiClient('/doctor/notifications/unread-count', { token });
}

export async function markDoctorNotificationRead(notificationId, token) {
  return apiClient(`/doctor/notifications/${notificationId}/read`, {
    method: 'PATCH',
    token,
  });
}

export async function markAllDoctorNotificationsRead(token) {
  return apiClient('/doctor/notifications/read-all', {
    method: 'PATCH',
    token,
  });
}
