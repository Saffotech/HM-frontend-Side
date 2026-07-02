import { API_BASE_URL, API_PREFIX, ROUTES } from '@/shared/constants';
import { getAuthRef } from '@/components/security/authRef';
import {
  applyRefreshedTokens,
  loadAuthSession,
} from '@/components/security/authSession';
import { refreshAccessToken } from '@/shared/api/auth';
import { isTokenExpired } from '@/shared/utils/jwtHelper';
import { isDemoReceptionistSession } from '@/features/receptionist/utils/receptionistPortal';

const DEFAULT_TIMEOUT_MS = 15000;
const AUTH_LOGIN_TIMEOUT_MS = 8000;

let refreshInFlight = null;

function parseDetail(detail) {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return null;
}

function resolveAuthToken(explicitToken) {
  if (explicitToken) return explicitToken;
  const refToken = getAuthRef().token;
  if (refToken) return refToken;
  return loadAuthSession()?.token ?? null;
}

async function refreshSessionTokens() {
  const session = loadAuthSession();
  if (isDemoReceptionistSession(session?.user)) return null;

  const refreshToken = session?.refreshToken;
  if (!refreshToken || isTokenExpired(refreshToken)) return null;

  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken(refreshToken)
      .then((data) => {
        const accessToken = data?.access_token;
        const nextRefresh = data?.refresh_token ?? refreshToken;
        if (!accessToken) return null;
        applyRefreshedTokens(accessToken, nextRefresh);
        const auth = getAuthRef();
        auth.applyTokens?.(accessToken, nextRefresh);
        return accessToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

async function fetchWithTimeout(url, options, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err?.name === 'AbortError') {
      const timeoutErr = new Error(
        'Server is not responding. Start the backend (port 8000) and try again.'
      );
      timeoutErr.status = 0;
      throw timeoutErr;
    }
    const networkErr = new Error(
      'Could not reach the server. Check that the backend is running and try again.'
    );
    networkErr.status = 0;
    throw networkErr;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Base fetch wrapper for API calls.
 * Mirrors shared request logic used across Routers/.
 */
export async function apiClient(endpoint, options = {}) {
  const {
    token,
    headers: customHeaders,
    skipSessionLogout = false,
    _retriedAfterRefresh = false,
    ...rest
  } = options;
  const isLoginRequest =
    endpoint === '/auth/login' || endpoint === '/auth/register';
  const isRefreshRequest = endpoint === '/auth/refresh';

  const authToken = isLoginRequest ? token : resolveAuthToken(token);

  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (authToken && !isRefreshRequest) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const timeoutMs = isLoginRequest ? AUTH_LOGIN_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;

  const response = await fetchWithTimeout(
    `${API_BASE_URL}${API_PREFIX}${endpoint}`,
    { headers, ...rest },
    timeoutMs
  );

  if (response.status === 204) return null;

  const body = await response.json().catch(() => ({}));

  if (response.status === 401) {
    const detail = parseDetail(body.detail);
    if (isLoginRequest || isRefreshRequest) {
      const err = new Error(
        detail || (isRefreshRequest ? 'Session expired. Please sign in again.' : 'Invalid email or password')
      );
      err.status = 401;
      throw err;
    }

    if (
      !skipSessionLogout
      && !_retriedAfterRefresh
      && authToken
    ) {
      const newToken = await refreshSessionTokens();
      if (newToken) {
        return apiClient(endpoint, {
          ...options,
          token: newToken,
          _retriedAfterRefresh: true,
        });
      }
    }

    if (!skipSessionLogout && authToken) {
      getAuthRef().logout();
      if (typeof window !== 'undefined' && window.location.pathname !== ROUTES.LOGIN) {
        window.location.assign(ROUTES.LOGIN);
      }
    }

    const err = new Error(detail || 'Session expired. Please sign in again.');
    err.status = 401;
    throw err;
  }

  if (!response.ok) {
    const detail = parseDetail(body.detail);
    const method = String(rest.method || 'GET').toUpperCase();
    const fallback =
      response.status >= 500
        ? method === 'GET'
          ? 'Server error — could not load data. Try again in a moment.'
          : 'Server error — the request may have partially saved. Refresh and check before retrying.'
        : 'Request failed';
    const err = new Error(detail || body.message || fallback);
    err.status = response.status;
    throw err;
  }

  return body;
}
