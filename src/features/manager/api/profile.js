/**
 * Manager self-service profile client.
 * No supported backend route exists for role `manager`.
 * GET/PUT /admin/profile is limited to role `admin`, so this client must not call it.
 */

import { apiClient, apiSessionRequest } from '@/shared/api/client';
import { API_BASE_URL } from '@/shared/constants';

export const ADMIN_PROFILE_EDITABLE_TOP_KEYS = [
  'qualification',
  'experience_years',
  'bio',
  'languages',
  'phone',
  'phone_code',
  'date_of_birth',
  'gender',
];

export function resolveAdminProfileImageUrl(profileImageUrl) {
  if (!profileImageUrl) return null;
  if (/^(https?:|blob:)/i.test(profileImageUrl)) return profileImageUrl;
  const base =
    API_BASE_URL ||
    (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');
  return `${base}${profileImageUrl}`;
}

export async function getAdminProfile(token) {
  return apiClient('/manager/profile', { token });
}

export async function updateAdminProfile(payload, token) {
  return apiClient('/manager/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
}

export async function uploadAdminProfileImage(file, token) {
  const formData = new FormData();
  formData.append('file', file);
  return apiSessionRequest('/manager/profile/image', {
    method: 'POST',
    body: formData,
    token,
    fallbackMessage: 'Profile image upload failed',
  });
}

export async function deleteAdminProfileImage(token) {
  return apiClient('/manager/profile/image', {
    method: 'DELETE',
    token,
  });
}
