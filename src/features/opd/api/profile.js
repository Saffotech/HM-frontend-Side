/**
 * OPD Billing self-service profile API client (GET/PUT /opd/profile + image).
 */

import { apiClient, apiSessionRequest } from '@/shared/api/client';
import { API_BASE_URL } from '@/shared/constants';

export const OPD_BILLING_PROFILE_EDITABLE_TOP_KEYS = [
  'qualification',
  'experience_years',
  'bio',
  'languages',
  'phone',
  'phone_code',
  'date_of_birth',
  'gender',
];

export function resolveOpdBillingProfileImageUrl(profileImageUrl) {
  if (!profileImageUrl) return null;
  if (/^(https?:|blob:)/i.test(profileImageUrl)) return profileImageUrl;
  const base =
    API_BASE_URL ||
    (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');
  return `${base}${profileImageUrl}`;
}

export async function getOpdBillingProfile(token) {
  return apiClient('/opd/profile', { token });
}

export async function updateOpdBillingProfile(payload, token) {
  return apiClient('/opd/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
}

export async function uploadOpdBillingProfileImage(file, token) {
  const formData = new FormData();
  formData.append('file', file);
  return apiSessionRequest('/opd/profile/image', {
    method: 'POST',
    body: formData,
    token,
    fallbackMessage: 'Profile image upload failed',
  });
}

export async function deleteOpdBillingProfileImage(token) {
  return apiClient('/opd/profile/image', {
    method: 'DELETE',
    token,
  });
}
