/**
 * Auth API — live FastAPI only (no mock).
 * Base: {VITE_API_BASE_URL}/auth/* (no /api prefix)
 */

import { apiClient } from './client';
import { trimCredentials } from '@/shared/utils/credentials';

const LOGIN_TIMEOUT_MS = 8000;

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        const err = new Error(message);
        err.status = 0;
        reject(err);
      }, ms);
    }),
  ]);
}

export async function login(credentials) {
  const trimmed = trimCredentials(credentials);
  return withTimeout(
    apiClient('/auth/login', {
      method: 'POST',
      body: JSON.stringify(trimmed),
    }),
    LOGIN_TIMEOUT_MS,
    'Server is not responding. Start the backend (port 8000) and try again.'
  );
}

export async function register(userData) {
  return apiClient('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function logout() {
  return { ok: true };
}

export async function getCurrentUser(token) {
  return apiClient('/auth/me', { token });
}

export async function refreshAccessToken(refreshToken) {
  return apiClient('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
    skipSessionLogout: true,
  });
}
