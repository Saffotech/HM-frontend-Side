export const PERMISSION_DENIED_MESSAGE = 'You do not have permission to access this.';
export const HOSPITAL_INACTIVE_MESSAGE = 'This hospital is inactive. Sign in again after it is reactivated.';
export const ACCOUNT_DEACTIVATED_MESSAGE = 'This account has been deactivated.';
export const INVALID_TENANT_MESSAGE = 'This account is not assigned to a hospital. Sign in with a hospital account.';
export const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.';

const BLOCKED_REQUEST_HEADERS = new Set([
  'x-tenant',
  'x-hospital-id',
  'x-tenant-id',
  'tenant-id',
  'tenant_id',
]);

export function shouldApplyHospitalSessionGuard(pathname) {
  if (typeof pathname !== 'string' || pathname.length === 0) return true;
  return pathname !== '/platform' && !pathname.startsWith('/platform/');
}

export function classifyForbidden(detail) {
  const text = String(detail || '').toLowerCase();
  if (text.includes('permission denied')) return 'permission_denied';
  if (text.includes('hospital is inactive')) return 'hospital_inactive';
  if (
    text.includes('account is deactivated')
    || text.includes('account has been deactivated')
    || text.includes('account is inactive')
    || text.includes('user is deactivated')
  ) {
    return 'account_deactivated';
  }
  return 'other';
}

export function isTerminalSessionError(error) {
  const status = error?.status;
  if (status === 401) return true;
  if (status === 404 && /user not found/i.test(`${error?.detail || ''} ${error?.message || ''}`)) {
    return true;
  }
  if (status !== 403) return false;
  const kind = classifyForbidden(error?.detail || error?.message);
  return kind === 'hospital_inactive' || kind === 'account_deactivated';
}

export function messageForSessionError(error) {
  if (error?.code === 'invalid_tenant') return INVALID_TENANT_MESSAGE;
  const kind = classifyForbidden(error?.detail || error?.message);
  if (kind === 'hospital_inactive') return HOSPITAL_INACTIVE_MESSAGE;
  if (kind === 'account_deactivated') return ACCOUNT_DEACTIVATED_MESSAGE;
  if (kind === 'permission_denied') return PERMISSION_DENIED_MESSAGE;
  return SESSION_EXPIRED_MESSAGE;
}

export function resolveSessionFailure(kind) {
  switch (kind) {
    case 'permission_denied':
      return { cleanup: false, notifyServer: false, message: PERMISSION_DENIED_MESSAGE };
    case 'hospital_inactive':
      return { cleanup: true, notifyServer: true, message: HOSPITAL_INACTIVE_MESSAGE };
    case 'account_deactivated':
      return { cleanup: true, notifyServer: true, message: ACCOUNT_DEACTIVATED_MESSAGE };
    case 'invalid_tenant':
      return { cleanup: true, notifyServer: true, message: INVALID_TENANT_MESSAGE };
    case 'refresh_failed':
      return { cleanup: true, notifyServer: false, message: SESSION_EXPIRED_MESSAGE };
    case 'logout':
    case 'timeout':
    case 'invalid_restore':
    case 'identity_change':
      return { cleanup: true, notifyServer: kind !== 'invalid_restore', message: null };
    default:
      return { cleanup: false, notifyServer: false, message: null };
  }
}

/** 401 keeps the one-time refresh. Only terminal 403s end the hospital session. */
export function sessionActionForHttpStatus(status, detail) {
  if (status === 401) return 'refresh_or_logout';
  if (status !== 403) return 'keep';
  const kind = classifyForbidden(detail);
  if (kind === 'permission_denied' || kind === 'other') return 'keep';
  return 'logout';
}

/** Every role returns to the one login URL. */
export function loginRouteForRole(_role, routes) {
  return routes?.default ?? '/login';
}

export function shouldRedirectToHospitalLogin(pathname, loginPaths) {
  if (!shouldApplyHospitalSessionGuard(pathname)) return false;
  if (!Array.isArray(loginPaths)) return true;
  return !loginPaths.includes(pathname);
}

export function sanitizeRequestHeaders(customHeaders, {
  authToken,
  isRefreshRequest = false,
  omitContentType = false,
} = {}) {
  const headers = omitContentType ? {} : {
    'Content-Type': 'application/json',
  };

  if (customHeaders && typeof customHeaders === 'object') {
    Object.entries(customHeaders).forEach(([key, value]) => {
      const normalized = String(key).toLowerCase();
      if (BLOCKED_REQUEST_HEADERS.has(normalized)) return;
      if (omitContentType && normalized === 'content-type') return;
      headers[key] = value;
    });
  }

  if (authToken && !isRefreshRequest) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  return headers;
}

export function supersededSessionError() {
  const error = new Error('Session ended');
  error.status = 0;
  error.code = 'session_superseded';
  error.sessionSuperseded = true;
  return error;
}

export function isSupersededSessionError(error) {
  return error?.code === 'session_superseded' || error?.sessionSuperseded === true;
}
