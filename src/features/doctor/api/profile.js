/**
 * Doctor Phase 2 by Atharva —
 * Doctor self-service profile API client against nested v2.0 backend contract
 * GET/PUT /doctor/profile + image upload/delete. Frontend-only wiring.
 */

import { apiClient } from '@/shared/api/client';
import { API_BASE_URL, API_PREFIX } from '@/shared/constants';

/** Top-level fields allowed on PUT — nested address / emergency_contact handled separately. */
export const DOCTOR_PROFILE_EDITABLE_TOP_KEYS = [
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
 * Doctor Phase 2 by Atharva —
 * Resolves avatar URL; static files are served from the API host under /uploads.
 */
export function resolveDoctorProfileImageUrl(profileImageUrl) {
  if (!profileImageUrl) return null;
  if (/^https?:\/\//i.test(profileImageUrl)) return profileImageUrl;
  const base =
    API_BASE_URL ||
    (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');
  return `${base}${profileImageUrl}`;
}

export async function getDoctorProfile(token) {
  return apiClient('/doctor/profile', { token });
}

export async function updateDoctorProfile(payload, token) {
  return apiClient('/doctor/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
}

/**
 * Doctor Phase 2 by Atharva —
 * Multipart upload must omit JSON Content-Type (field name must be "file").
 */
export async function uploadDoctorProfileImage(file, token) {
  const formData = new FormData();
  formData.append('file', file);

  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}${API_PREFIX}/doctor/profile/image`,
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

export async function deleteDoctorProfileImage(token) {
  return apiClient('/doctor/profile/image', {
    method: 'DELETE',
    token,
  });
}
