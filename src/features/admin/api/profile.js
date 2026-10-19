/**
 * Hospital Owner profile client.
 * Supported routes: GET/PUT /admin/profile and POST/DELETE /admin/profile/image.
 * The owner screen is only mounted for role `admin`, which the backend authorizes.
 */

import { apiClient, apiSessionRequest } from '@/shared/api/client';
import { API_BASE_URL } from '@/shared/constants';

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
  return apiClient('/admin/profile', { token });
}

export async function updateSuperAdminProfile(payload, token) {
  return apiClient('/admin/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
}

export async function uploadSuperAdminProfileImage(file, token) {
  const formData = new FormData();
  formData.append('file', file);
  return apiSessionRequest('/admin/profile/image', {
    method: 'POST',
    body: formData,
    token,
    fallbackMessage: 'Profile image upload failed',
  });
}

export async function deleteSuperAdminProfileImage(token) {
  return apiClient('/admin/profile/image', {
    method: 'DELETE',
    token,
  });
}
