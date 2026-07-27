/**
 * Lab Technician self-service profile API client (GET/PUT /lab/profile + image).
 * Live backend; admin-owned fields must never be sent on PUT.
 */

import { apiClient } from '@/shared/api/client';
import { API_BASE_URL, API_PREFIX } from '@/shared/constants';

export const LAB_TECHNICIAN_PROFILE_EDITABLE_TOP_KEYS = [
  'qualification',
  'license_number',
  'experience_years',
  'bio',
  'languages',
  'phone',
  'phone_code',
  'date_of_birth',
  'gender',
];

/** Resolves avatar URL; static files are under /uploads on the API host. */
export function resolveLabTechnicianProfileImageUrl(profileImageUrl) {
  if (!profileImageUrl) return null;
  if (/^(https?:|blob:)/i.test(profileImageUrl)) return profileImageUrl;
  const base =
    API_BASE_URL ||
    (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');
  return `${base}${profileImageUrl}`;
}

export async function getLabTechnicianProfile(token) {
  return apiClient('/lab/profile', { token });
}

export async function updateLabTechnicianProfile(payload, token) {
  return apiClient('/lab/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
}

/** Multipart upload must omit JSON Content-Type (field name must be "file"). */
export async function uploadLabTechnicianProfileImage(file, token) {
  const formData = new FormData();
  formData.append('file', file);

  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}${API_PREFIX}/lab/profile/image`,
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

export async function deleteLabTechnicianProfileImage(token) {
  return apiClient('/lab/profile/image', {
    method: 'DELETE',
    token,
  });
}
