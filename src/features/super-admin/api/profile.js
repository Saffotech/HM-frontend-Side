/**
 * Super Admin self-service profile API client (GET/PUT /super-admin/profile + image).
 */

import { apiClient } from '@/shared/api/client';
import { API_BASE_URL, API_PREFIX } from '@/shared/constants';

export const SUPER_ADMIN_PROFILE_EDITABLE_TOP_KEYS = [
  'bio',
  'languages',
  'phone',
  'phone_code',
  'date_of_birth',
  'gender',
];

export function resolveSuperAdminProfileImageUrl(profileImageUrl) {
  if (!profileImageUrl) return null;
  if (/^(https?:|blob:)/i.test(profileImageUrl)) return profileImageUrl;
  const base =
    API_BASE_URL ||
    (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');
  return `${base}${profileImageUrl}`;
}

export async function getSuperAdminProfile(token) {
  return apiClient('/super-admin/profile', { token });
}

export async function updateSuperAdminProfile(payload, token) {
  return apiClient('/super-admin/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
}

export async function uploadSuperAdminProfileImage(file, token) {
  const formData = new FormData();
  formData.append('file', file);

  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}${API_PREFIX}/super-admin/profile/image`,
    {
      method: 'POST',
      headers,
      body: formData,
    }
  );

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof body.detail === 'string' ? body.detail : body.message;
    const err = new Error(detail || 'Profile image upload failed');
    err.status = response.status;
    throw err;
  }
  return body;
}

export async function deleteSuperAdminProfileImage(token) {
  return apiClient('/super-admin/profile/image', {
    method: 'DELETE',
    token,
  });
}
