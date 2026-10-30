import { API_BASE_URL, API_PREFIX, ROUTES } from '@/shared/constants';
import { getAuthRef } from '@/components/security/authRef';
import {
  applyRefreshedTokens,
  loadAuthSession,
} from '@/components/security/authSession';
import { refreshAccessToken } from '@/shared/api/auth';
import { isTokenExpired, decodeJwt } from '@/shared/utils/jwtHelper';
import { currentSessionEpoch, isSessionCurrent } from '@/components/security/sessionEpoch';
import {
  classifyForbidden,
  isTerminalSessionError,
  loginRouteForRole,
  messageForSessionError,
  sanitizeRequestHeaders,
  sessionActionForHttpStatus,
  shouldRedirectToHospitalLogin,
  supersededSessionError,
} from '@/components/security/httpSessionPolicy';
import {
  NETWORK_MESSAGE,
  NETWORK_MUTATION_MESSAGE,
  TIMEOUT_MESSAGE,
  TIMEOUT_MUTATION_MESSAGE,
  userFacingMessage,
} from '@/shared/errors/errorClassification';
import { recordClientDiagnostic, sanitizeRequestId, scrubRoute } from '@/shared/errors/errorDiagnostics';

function isLegacyDemoSession(user, token) {
  if (user?.isDemoSession) return true;
  if (!token) return false;
  if (String(token).endsWith('.demo')) return true;
  const payload = decodeJwt(token);
  return Boolean(payload?.demo);
}

const DEFAULT_TIMEOUT_MS = 15000;
const AUTH_LOGIN_TIMEOUT_MS = 8000;

let refreshInFlight = null;
let refreshEpoch = null;

const HOSPITAL_LOGIN_PATHS = [
  ROUTES.LOGIN,
  ROUTES.ADMIN_LOGIN,
  ROUTES.SUPER_ADMIN_LOGIN,
  ROUTES.RECEPTIONIST_LOGIN,
  ROUTES.PHARMACY_LOGIN,
  ROUTES.PATIENT_LOGIN,
];

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

function redirectToHospitalLogin(role) {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (!shouldRedirectToHospitalLogin(path, HOSPITAL_LOGIN_PATHS)) return;
  const target = loginRouteForRole(role, {
    default: ROUTES.LOGIN,
  });
  if (path === target) return;
  window.location.assign(target);
}

function endHospitalSession(message, role, notifyServer) {
  const sessionUser = loadAuthSession()?.user;
  getAuthRef().logout?.({
    message,
    notifyServer,
  });
  redirectToHospitalLogin(role ?? sessionUser?.role);
}

async function refreshOrEndTerminalSession(epochAtStart, authToken) {
  try {
    return await refreshSessionTokens();
  } catch (refreshErr) {
    if (!isSessionCurrent(epochAtStart)) throw supersededSessionError();
    if (isTerminalSessionError(refreshErr) && authToken && !isLegacyDemoSession(loadAuthSession()?.user, authToken)) {
      const sessionUser = loadAuthSession()?.user;
      endHospitalSession(messageForSessionError(refreshErr), sessionUser?.role, true);
    }
    throw refreshErr;
  }
}

async function refreshSessionTokens() {
  const epochAtStart = currentSessionEpoch();
  if (refreshInFlight && refreshEpoch === epochAtStart) return refreshInFlight;

  const session = loadAuthSession();
  if (isLegacyDemoSession(session?.user, session?.token)) return null;

  const refreshToken = session?.refreshToken;
  if (!refreshToken || isTokenExpired(refreshToken)) return null;

  refreshEpoch = epochAtStart;
  refreshInFlight = refreshAccessToken(refreshToken)
    .then((data) => {
      if (!isSessionCurrent(epochAtStart)) return null;
      const accessToken = data?.access_token;
      const nextRefresh = data?.refresh_token ?? refreshToken;
      if (!accessToken) return null;
      applyRefreshedTokens(accessToken, nextRefresh);
      const auth = getAuthRef();
      auth.applyTokens?.(accessToken, nextRefresh, epochAtStart);
      return accessToken;
    })
    .catch((err) => {
      if (isTerminalSessionError(err)) throw err;
      return null;
    })
    .finally(() => {
      if (refreshEpoch === epochAtStart) {
        refreshInFlight = null;
        refreshEpoch = null;
      }
    });

  return refreshInFlight;
}

function requestMethod(options) {
  return String(options?.method || 'GET').toUpperCase();
}

function readRequestId(response) {
  if (!response?.headers?.get) return null;
  return sanitizeRequestId(
    response.headers.get('x-request-id') || response.headers.get('x-correlation-id')
  );
}

function readRetryAfterSeconds(response) {
  if (!response?.headers?.get) return null;
  const raw = response.headers.get('retry-after');
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const when = Date.parse(raw);
  if (!Number.isFinite(when)) return null;
  return Math.max(0, Math.round((when - Date.now()) / 1000));
}

function noteFailure(err, response) {
  const requestId = readRequestId(response);
  if (requestId) err.requestId = requestId;
  const retryAfter = readRetryAfterSeconds(response);
  if (retryAfter != null) err.retryAfterSeconds = retryAfter;
  try {
    recordClientDiagnostic({
      category: err.category || 'unexpected',
      status: err.status,
      requestId,
      network: err.category === 'network' || err.category === 'timeout',
      chunk: false,
      route: typeof window !== 'undefined' ? scrubRoute(window.location.pathname) : null,
    });
  } catch {
    /* Diagnostics must not change the request result. */
  }
  return err;
}

function transportFailure(kind, method) {
  const unsafe = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
  const err = new Error(
    kind === 'timeout'
      ? (unsafe ? TIMEOUT_MUTATION_MESSAGE : TIMEOUT_MESSAGE)
      : (unsafe ? NETWORK_MUTATION_MESSAGE : NETWORK_MESSAGE)
  );
  err.status = 0;
  err.code = kind;
  err.category = kind;
  err.method = method;
  return noteFailure(err, null);
}

function httpFailure(response, body, method, fallbackMessage) {
  const detail = parseDetail(body?.detail);
  const err = new Error(fallbackMessage || 'Request failed');
  err.status = response.status;
  err.detail = detail;
  err.method = method;
  if (response.status === 429) err.category = 'rate_limit';
  else if (response.status === 404) err.category = 'not_found';
  else if (response.status >= 500) err.category = 'server';
  else if (response.status === 400 || response.status === 409 || response.status === 422) {
    err.category = 'validation';
    err.message = detail || body?.message || err.message;
  }
  const retryAfter = readRetryAfterSeconds(response);
  if (retryAfter != null) err.retryAfterSeconds = retryAfter;
  err.message = userFacingMessage(err) || err.message;
  return noteFailure(err, response);
}

async function fetchWithTimeout(url, options, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const method = requestMethod(options);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err?.name === 'AbortError') throw transportFailure('timeout', method);
    throw transportFailure('network', method);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Base fetch wrapper for API calls.
 * Hospital identity comes from the Bearer token. Callers cannot select a hospital.
 */
export async function apiClient(endpoint, options = {}) {
  const {
    token,
    headers: customHeaders,
    skipSessionLogout = false,
    _retriedAfterRefresh = false,
    ...rest
  } = options;
  const isLoginRequest = endpoint === '/auth/login';
  const isRefreshRequest = endpoint === '/auth/refresh';
  const isLogoutRequest = endpoint === '/auth/logout';
  const epochAtStart = currentSessionEpoch();

  const authToken = isLoginRequest ? token : resolveAuthToken(token);
  const headers = sanitizeRequestHeaders(customHeaders, {
    authToken,
    isRefreshRequest,
  });

  const timeoutMs = isLoginRequest ? AUTH_LOGIN_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;

  const response = await fetchWithTimeout(
    `${API_BASE_URL}${API_PREFIX}${endpoint}`,
    { headers, ...rest },
    timeoutMs
  );

  if (!isLoginRequest && !isRefreshRequest && !isSessionCurrent(epochAtStart)) {
    throw supersededSessionError();
  }

  if (response.status === 204) return null;

  const body = await response.json().catch(() => ({}));

  if (response.status === 401) {
    const detail = parseDetail(body.detail);
    if (isLoginRequest || isRefreshRequest || isLogoutRequest) {
      const err = new Error(
        detail || (isRefreshRequest || isLogoutRequest
          ? 'Session expired. Please sign in again.'
          : 'Invalid email or password')
      );
      err.status = 401;
      err.detail = detail;
      throw err;
    }

    if (!isSessionCurrent(epochAtStart)) throw supersededSessionError();

    if (
      !skipSessionLogout
      && !_retriedAfterRefresh
      && authToken
    ) {
      const newToken = await refreshOrEndTerminalSession(epochAtStart, authToken);
      if (!isSessionCurrent(epochAtStart)) throw supersededSessionError();
      if (newToken) {
        return apiClient(endpoint, {
          ...options,
          token: newToken,
          _retriedAfterRefresh: true,
        });
      }
    }

    if (!isSessionCurrent(epochAtStart)) throw supersededSessionError();

    if (!skipSessionLogout && authToken) {
      const sessionUser = loadAuthSession()?.user;
      if (!isLegacyDemoSession(sessionUser, authToken)) {
        const failureMessage = detail || messageForSessionError({ status: 401 });
        endHospitalSession(failureMessage, sessionUser?.role, false);
      }
    }

    const err = new Error(detail || 'Session expired. Please sign in again.');
    err.status = 401;
    err.detail = detail;
    throw err;
  }

  if (response.status === 403) {
    const detail = parseDetail(body.detail);
    const action = sessionActionForHttpStatus(403, detail);
    const kind = classifyForbidden(detail);

    if (action === 'logout' && !skipSessionLogout && isSessionCurrent(epochAtStart)) {
      const sessionUser = loadAuthSession()?.user;
      endHospitalSession(messageForSessionError({ status: 403, detail }), sessionUser?.role, true);
    }

    const err = new Error(
      kind === 'permission_denied'
        ? messageForSessionError({ status: 403, detail })
        : (detail || 'Request failed')
    );
    err.status = 403;
    err.detail = detail;
    err.code = kind === 'other' ? undefined : kind;
    throw err;
  }

  if (!response.ok) {
    throw httpFailure(response, body, requestMethod(rest), 'Request failed');
  }

  return body;
}

/**
 * Multipart uploads and binary downloads.
 * Uses the same Bearer token, one-time refresh, and 403 policy as apiClient.
 * Content-Type is left unset so the browser can set the multipart boundary.
 * A response that finishes after the session changes is discarded.
 */
export async function apiSessionRequest(endpoint, options = {}) {
  const {
    token,
    headers: customHeaders,
    skipSessionLogout = false,
    _retriedAfterRefresh = false,
    responseType = 'json',
    fallbackMessage = 'Request failed',
    fallbackFileName = 'download',
    ...rest
  } = options;
  const epochAtStart = currentSessionEpoch();
  const authToken = resolveAuthToken(token);
  const headers = sanitizeRequestHeaders(customHeaders, {
    authToken,
    omitContentType: true,
  });

  const response = await fetchWithTimeout(
    `${API_BASE_URL}${API_PREFIX}${endpoint}`,
    { headers, ...rest },
  );

  if (!isSessionCurrent(epochAtStart)) throw supersededSessionError();

  if (response.status === 401) {
    const body = await response.json().catch(() => ({}));
    if (!isSessionCurrent(epochAtStart)) throw supersededSessionError();
    const detail = parseDetail(body.detail);
    if (!skipSessionLogout && !_retriedAfterRefresh && authToken) {
      const newToken = await refreshOrEndTerminalSession(epochAtStart, authToken);
      if (!isSessionCurrent(epochAtStart)) throw supersededSessionError();
      if (newToken) {
        return apiSessionRequest(endpoint, {
          ...options,
          token: newToken,
          _retriedAfterRefresh: true,
        });
      }
    }

    if (!isSessionCurrent(epochAtStart)) throw supersededSessionError();

    if (!skipSessionLogout && authToken) {
      const sessionUser = loadAuthSession()?.user;
      if (!isLegacyDemoSession(sessionUser, authToken)) {
        endHospitalSession(
          detail || messageForSessionError({ status: 401 }),
          sessionUser?.role,
          false,
        );
      }
    }

    const err = new Error(detail || 'Session expired. Please sign in again.');
    err.status = 401;
    err.detail = detail;
    throw err;
  }

  if (response.status === 403) {
    const body = await response.json().catch(() => ({}));
    if (!isSessionCurrent(epochAtStart)) throw supersededSessionError();
    const detail = parseDetail(body.detail);
    const action = sessionActionForHttpStatus(403, detail);
    const kind = classifyForbidden(detail);
    if (action === 'logout' && !skipSessionLogout && isSessionCurrent(epochAtStart)) {
      const sessionUser = loadAuthSession()?.user;
      endHospitalSession(messageForSessionError({ status: 403, detail }), sessionUser?.role, true);
    }
    const err = new Error(
      kind === 'permission_denied'
        ? messageForSessionError({ status: 403, detail })
        : (detail || fallbackMessage),
    );
    err.status = 403;
    err.detail = detail;
    err.code = kind === 'other' ? undefined : kind;
    throw err;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (!isSessionCurrent(epochAtStart)) throw supersededSessionError();
    throw httpFailure(response, body, requestMethod(rest), fallbackMessage);
  }

  if (responseType === 'blob') {
    const blob = await response.blob();
    if (!isSessionCurrent(epochAtStart)) throw supersededSessionError();
    const disposition = response.headers.get('content-disposition') ?? '';
    const match = disposition.match(/filename="?([^"]+)"?/i);
    return {
      blob,
      fileName: match?.[1] ?? fallbackFileName,
      contentType: response.headers.get('content-type') ?? blob.type ?? '',
    };
  }

  if (response.status === 204) return null;

  const body = await response.json().catch(() => ({}));
  if (!isSessionCurrent(epochAtStart)) throw supersededSessionError();
  return body;
}
