/**
 * Nurse Phase 2 by Atharva —
 * Nurse self-service profile API client (GET/PUT /nurse/profile + image).
 * Frontend-only; admin-owned fields must never be sent on PUT.
 */

import { apiClient } from '@/shared/api/client';
import { API_BASE_URL, API_PREFIX } from '@/shared/constants';

export const NURSE_PROFILE_EDITABLE_TOP_KEYS = [
  'qualification',
  'experience_years',
  'bio',
  'languages',
  'phone',
  'phone_code',
  'date_of_birth',
  'gender',
];

/**
 * Nurse Phase 2 by Atharva —
 * Resolves avatar URL; static files are under /uploads on the API host.
 */
export function resolveNurseProfileImageUrl(profileImageUrl) {
  if (!profileImageUrl) return null;
  if (/^https?:\/\//i.test(profileImageUrl)) return profileImageUrl;
  const base =
    API_BASE_URL ||
    (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');
  return `${base}${profileImageUrl}`;
}

export async function getNurseProfile(token) {
  return apiClient('/nurse/profile', { token });
}

export async function updateNurseProfile(payload, token) {
  return apiClient('/nurse/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
}

/**
 * Nurse Phase 2 by Atharva —
 * Multipart upload must omit JSON Content-Type (field name must be "file").
 */
export async function uploadNurseProfileImage(file, token) {
  const formData = new FormData();
  formData.append('file', file);

  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${API_PREFIX}/nurse/profile/image`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof body.detail === 'string' ? body.detail : body.message;
    const err = new Error(detail || 'Profile image upload failed');
    err.status = response.status;
    throw err;
  }
  return body;
}

export async function deleteNurseProfileImage(token) {
  return apiClient('/nurse/profile/image', {
    method: 'DELETE',
    token,
  });
}
