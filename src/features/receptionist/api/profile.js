/**
 * Receptionist self-service profile API client (GET/PUT /receptionist/profile + image).
 * Live backend; admin-owned fields must never be sent on PUT.
 */

import { apiClient } from '@/shared/api/client';
import { API_BASE_URL, API_PREFIX } from '@/shared/constants';

export const RECEPTIONIST_PROFILE_EDITABLE_TOP_KEYS = [
  'qualification',
  'experience_years',
  'bio',
  'languages',
  'phone',
  'phone_code',
  'date_of_birth',
  'gender',
];

/** Resolves avatar URL; static files are under /uploads on the API host. */
export function resolveReceptionistProfileImageUrl(profileImageUrl) {
  if (!profileImageUrl) return null;
  if (/^(https?:|blob:)/i.test(profileImageUrl)) return profileImageUrl;
  const base =
    API_BASE_URL ||
    (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');
  return `${base}${profileImageUrl}`;
}

export async function getReceptionistProfile(token) {
  return apiClient('/receptionist/profile', { token });
}

export async function updateReceptionistProfile(payload, token) {
  return apiClient('/receptionist/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
}

/** Multipart upload must omit JSON Content-Type (field name must be "file"). */
export async function uploadReceptionistProfileImage(file, token) {
  const formData = new FormData();
  formData.append('file', file);

  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}${API_PREFIX}/receptionist/profile/image`,
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

export async function deleteReceptionistProfileImage(token) {
  return apiClient('/receptionist/profile/image', {
    method: 'DELETE',
    token,
  });
}
