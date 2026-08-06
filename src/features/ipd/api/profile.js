/**
 * IPD profile API — live backend `/ipd/profile*`.
 */

import { apiClient } from '@/shared/api/client';
import { API_BASE_URL, API_PREFIX } from '@/shared/constants';

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

  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${API_PREFIX}/ipd/profile/image`, {
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

export async function deleteIpdProfileImage(token) {
  return apiClient('/ipd/profile/image', {
    method: 'DELETE',
    token,
  });
}
