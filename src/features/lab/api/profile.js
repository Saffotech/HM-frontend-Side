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

/** Build a display profile from /auth/me when GET /lab/profile is 404. */
export function mapAuthMeToLabProfile(me) {
  if (!me) return null;
  const roleName = me.role ?? me.role_name ?? 'lab_technician';
  const department =
    me.department && typeof me.department === 'object'
      ? me.department
      : me.department_name
        ? { id: me.department_id ?? null, name: me.department_name }
        : null;
  return {
    user_id: me.user_id ?? me.id,
    first_name: me.first_name ?? '',
    last_name: me.last_name ?? '',
    email: me.email ?? '',
    phone: me.phone ?? null,
    phone_code: me.phone_code ?? '+91',
    address: {
      line: me.address ?? null,
      city: me.city ?? null,
      state: me.state ?? null,
      country: me.country ?? null,
      postal_code: me.postal_code ?? null,
    },
    date_of_birth: me.date_of_birth ?? null,
    gender: me.gender ?? null,
    emergency_contact: {
      name: me.emergency_contact_name ?? null,
      phone: me.emergency_contact_phone ?? null,
    },
    department,
    role: { id: me.role_id ?? null, name: roleName },
    qualification: null,
    license_number: null,
    employee_id: me.employee_id ?? null,
    experience_years: null,
    joining_date: null,
    bio: null,
    languages: [],
    shift: null,
    profile_image_url: me.profile_image_url ?? null,
    is_profile_completed: false,
    profile_completion_percentage: 0,
    is_active: me.is_active !== false,
    last_login: me.last_login ?? null,
    created_at: me.created_at ?? null,
    updated_at: null,
    isFallback: true,
  };
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
