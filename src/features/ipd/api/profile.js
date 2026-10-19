/**
 * IPD self-service profile API client (GET/PUT /ipd/profile + image).
 */

import { apiClient, apiSessionRequest } from '@/shared/api/client';
import { API_BASE_URL } from '@/shared/constants';

export const IPD_PROFILE_EDITABLE_TOP_KEYS = [
  'qualification',
  'experience_years',
  'bio',
  'languages',
  'phone',
  'phone_code',
  'date_of_birth',
  'gender',
];

export function resolveIpdProfileImageUrl(profileImageUrl) {
  if (!profileImageUrl) return null;
  if (/^(https?:|blob:)/i.test(profileImageUrl)) return profileImageUrl;
  const base =
    API_BASE_URL ||
    (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');
  return `${base}${profileImageUrl}`;
}

export async function getIpdProfile(token) {
  return apiClient('/ipd/profile', { token });
}

export async function updateIpdProfile(payload, token) {
  return apiClient('/ipd/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
}

export async function uploadIpdProfileImage(file, token) {
  const formData = new FormData();
  formData.append('file', file);
  return apiSessionRequest('/ipd/profile/image', {
    method: 'POST',
    body: formData,
    token,
    fallbackMessage: 'Profile image upload failed',
  });
}

export async function deleteIpdProfileImage(token) {
  return apiClient('/ipd/profile/image', {
    method: 'DELETE',
    token,
  });
}
