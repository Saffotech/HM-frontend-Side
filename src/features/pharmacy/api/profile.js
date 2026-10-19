/**
 * Pharmacist self-service profile API client (GET/PUT /pharmacy/profile + image).
 * Live backend; admin-owned fields must never be sent on PUT.
 */

import { apiClient, apiSessionRequest } from '@/shared/api/client';
import { API_BASE_URL } from '@/shared/constants';

export const PHARMACIST_PROFILE_EDITABLE_TOP_KEYS = [
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
export function resolvePharmacistProfileImageUrl(profileImageUrl) {
  if (!profileImageUrl) return null;
  if (/^(https?:|blob:)/i.test(profileImageUrl)) return profileImageUrl;
  const base =
    API_BASE_URL ||
    (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');
  return `${base}${profileImageUrl}`;
}

export async function getPharmacistProfile(token) {
  return apiClient('/pharmacy/profile', { token });
}

export async function updatePharmacistProfile(payload, token) {
  return apiClient('/pharmacy/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
}

/** Multipart upload must omit JSON Content-Type (field name must be "file"). */
export async function uploadPharmacistProfileImage(file, token) {
  const formData = new FormData();
  formData.append('file', file);
  return apiSessionRequest('/pharmacy/profile/image', {
    method: 'POST',
    body: formData,
    token,
    fallbackMessage: 'Profile image upload failed',
  });
}

export async function deletePharmacistProfileImage(token) {
  return apiClient('/pharmacy/profile/image', {
    method: 'DELETE',
    token,
  });
}
