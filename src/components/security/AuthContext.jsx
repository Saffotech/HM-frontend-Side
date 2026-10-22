import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { login as apiLogin, getCurrentUser, refreshAccessToken, logout as requestHospitalLogout } from '@/shared/api/auth';
import { setAuthRef, getAuthRef } from '@/components/security/authRef';
import {
  loadAuthSession,
  saveAuthSession,
  clearAuthSession,
} from '@/components/security/authSession';
import { performHospitalCleanup } from '@/components/security/hospitalCleanup';
import { setHospitalStorageScope } from '@/components/security/hospitalStorageScope';
import {
  identitiesDiffer,
  isValidTenantId,
  mergeAuthenticatedProfile,
} from '@/components/security/hospitalIdentity';
import {
  classifyForbidden,
  isSupersededSessionError,
  isTerminalSessionError,
  messageForSessionError,
  resolveSessionFailure,
  sessionCleanupNotifiesServer,
} from '@/components/security/httpSessionPolicy';
import {
  beginNewSessionEpoch,
  currentSessionEpoch,
  getLogoutTask,
  isSessionCurrent,
  setLogoutTask,
} from '@/components/security/sessionEpoch';
import { clearSessionNotice, peekSessionNotice, publishSessionNotice } from '@/components/security/sessionNotice';
import { clearAllConsultationDrafts } from '@/shared/utils/consultationDraftStorage';
import { decodeJwt, isTokenExpired, getTokenExpiresInMs } from '@/shared/utils/jwtHelper';
import { normalizeRole, DEPARTMENT_BY_ROLE } from '@/shared/utils/roleUtils';
import { isPlatformLoginRole } from '@/shared/auth/universalLoginPolicy';

function rememberHospitalScope(profile) {
  if (!profile) {
    setHospitalStorageScope(null);
    return;
  }
  setHospitalStorageScope({
    tenantId: profile.tenant_id,
    userId: profile.user_id ?? profile.id,
  });
}

function isLegacyDemoSuperAdminToken(token) {
  if (!token) return false;
  if (String(token).endsWith('.demo')) return true;
  const payload = decodeJwt(token);
  return Boolean(payload?.demo);
}

const AuthContext = createContext(null);
const SESSION_RESTORE_TIMEOUT_MS = 15000;
const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

function resolvePermissions(loginData, accessToken) {
  if (Array.isArray(loginData?.permissions) && loginData.permissions.length > 0) {
    return loginData.permissions;
  }
  const payload = decodeJwt(accessToken);
  if (Array.isArray(payload?.permissions) && payload.permissions.length > 0) {
    return payload.permissions;
  }
  return [];
}

function buildAuthenticated(user, token) {
  return Boolean(
    token
    && user
    && !isTokenExpired(token)
    && isValidTenantId(user.tenant_id)
  );
}

function invalidTenantError() {
  const failure = resolveSessionFailure('invalid_tenant');
  const error = new Error(failure.message);
  error.status = 403;
  error.code = 'invalid_tenant';
  return error;
}

async function fetchValidAccessToken(session) {
  if (!session?.token) return null;

  if (!isTokenExpired(session.token)) {
    return session.token;
  }

  if (!session.refreshToken || isTokenExpired(session.refreshToken)) {
    return null;
  }

  const data = await refreshAccessToken(session.refreshToken);
  const accessToken = data?.access_token;
  if (!accessToken) return null;

  return {
    accessToken,
    refreshToken: data.refresh_token ?? session.refreshToken,
  };
}



function getInitialAuthState() {
  const signedOut = { user: null, token: null, authReady: true };
  const session = loadAuthSession();
  if (!session?.token || !session?.user) return signedOut;
  if (isLegacyDemoSuperAdminToken(session.token) || session.user?.isDemoSession) return signedOut;
  if (isTokenExpired(session.token)) {
    return { user: null, token: null, authReady: false };
  }
  return { user: session.user, token: session.token, authReady: true };
}

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();

  const [user, setUser] = useState(() => getInitialAuthState().user);

  const [token, setToken] = useState(() => getInitialAuthState().token);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState(null);

  const [authReady, setAuthReady] = useState(() => getInitialAuthState().authReady);

  const refreshTimerRef = useRef(null);
  const userRef = useRef(null);
  const tokenRef = useRef(null);
  userRef.current = user;
  tokenRef.current = token;

  const isAuthenticated = buildAuthenticated(user, token);

  const cleanupHospitalState = useCallback(() => {
    performHospitalCleanup({
      clearStoredSession: clearAuthSession,
      clearDrafts: clearAllConsultationDrafts,
      cancelQueries: () => {
        queryClient.cancelQueries();
      },
      clearQueries: () => {
        queryClient.clear();
      },
    });
  }, [queryClient]);

  const logout = useCallback((options = {}) => {
    const existing = getLogoutTask();
    if (existing) return existing;

    beginNewSessionEpoch();
    const accessToken = tokenRef.current || loadAuthSession()?.token || null;
    const notifyServer = options.notifyServer !== false
      && Boolean(accessToken)
      && !isLegacyDemoSuperAdminToken(accessToken);

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    setUser(null);
    setToken(null);
    setLoading(false);
    if (options.message) publishSessionNotice(options.message);
    else clearSessionNotice();
    setError(options.message ?? null);

    let pending = Promise.resolve(null);
    try {
      if (notifyServer) pending = requestHospitalLogout(accessToken);
    } catch {
      pending = Promise.resolve(null);
    }
    const finished = pending.catch(() => null).finally(() => {
      if (getLogoutTask() === finished) setLogoutTask(null);
    });
    setLogoutTask(finished);
    cleanupHospitalState();
    return finished;
  }, [cleanupHospitalState]);

  const adoptHospitalProfile = useCallback((profile, previous, accessToken, refreshToken) => {
    if (isPlatformLoginRole(profile?.role)) {
      logout({ notifyServer: false });
      const realmError = new Error('This account cannot use hospital sign-in.');
      realmError.status = 403;
      realmError.code = 'platform_realm';
      throw realmError;
    }

    if (!isValidTenantId(profile?.tenant_id)) {
      const failure = invalidTenantError();
      logout({ message: failure.message, notifyServer: true });
      throw failure;
    }

    if (identitiesDiffer(previous, profile)) {
      beginNewSessionEpoch();
      setUser(null);
      setToken(null);
      cleanupHospitalState();
    }

    rememberHospitalScope(profile);
    setToken(accessToken);
    setUser(profile);
    saveAuthSession(accessToken, profile, refreshToken);
    clearSessionNotice();
    setError(null);
    return profile;
  }, [cleanupHospitalState, logout]);

  const applyTokens = useCallback((accessToken, refreshToken, epochAtStart) => {
    if (epochAtStart != null && !isSessionCurrent(epochAtStart)) return;
    const session = loadAuthSession();
    const stored = session?.user ?? null;
    if (stored && !isValidTenantId(stored.tenant_id)) {
      logout({
        message: resolveSessionFailure('invalid_tenant').message,
        notifyServer: false,
      });
      return;
    }
    setToken(accessToken);
    if (!stored) return;
    saveAuthSession(accessToken, stored, refreshToken ?? session?.refreshToken);
    setUser((prev) => {
      if (!prev) return stored;
      if (identitiesDiffer(prev, stored)) return prev;
      return prev;
    });
  }, [logout]);

  const refreshSession = useCallback(async () => {
    const epochAtStart = currentSessionEpoch();
    const session = loadAuthSession();
    if (!session?.refreshToken || isTokenExpired(session.refreshToken)) {
      const failure = resolveSessionFailure('refresh_failed');
      logout({ message: failure.message, notifyServer: false });
      throw new Error(failure.message);
    }

    let accessToken;
    let refreshToken;
    try {
      const data = await refreshAccessToken(session.refreshToken);
      if (!isSessionCurrent(epochAtStart)) return null;
      accessToken = data?.access_token;
      refreshToken = data?.refresh_token ?? session.refreshToken;
      if (!accessToken) throw new Error('Refresh failed');
    } catch (err) {
      if (!isSessionCurrent(epochAtStart) || isSupersededSessionError(err)) return null;
      if (err?.code === 'invalid_tenant' || err?.code === 'platform_realm') throw err;
      const kind = classifyForbidden(err?.detail || err?.message);
      logout({
        message: isTerminalSessionError(err) ? messageForSessionError(err) : resolveSessionFailure('refresh_failed').message,
        notifyServer: sessionCleanupNotifiesServer(kind),
      });
      throw err;
    }

    const previous = userRef.current ?? session.user ?? null;
    setToken(accessToken);
    if (previous && isValidTenantId(previous.tenant_id)) {
      saveAuthSession(accessToken, previous, refreshToken);
    }

    try {
      const me = await getCurrentUser(accessToken);
      if (!isSessionCurrent(epochAtStart)) return accessToken;
      const profile = mergeAuthenticatedProfile(
        previous,
        me,
        { permissions: previous?.permissions, role: previous?.role },
        accessToken,
        resolvePermissions
      );
      return adoptHospitalProfile(profile, previous, accessToken, refreshToken) ? accessToken : null;
    } catch (err) {
      if (!isSessionCurrent(epochAtStart) || isSupersededSessionError(err)) return null;
      if (err?.code === 'invalid_tenant' || err?.code === 'platform_realm') throw err;
      if (isTerminalSessionError(err)) {
        const kind = classifyForbidden(err?.detail || err?.message);
        logout({
          message: messageForSessionError(err),
          notifyServer: sessionCleanupNotifiesServer(kind),
        });
        throw err;
      }
      return accessToken;
    }
  }, [adoptHospitalProfile, logout]);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      if (!prev) return prev;
      const rest = { ...(updates ?? {}) };
      delete rest.tenant_id;
      delete rest.hospital;
      delete rest.user_id;
      delete rest.id;
      const next = {
        ...prev,
        ...rest,
        id: prev.id,
        user_id: prev.user_id,
        tenant_id: prev.tenant_id,
        hospital: prev.hospital ? { ...prev.hospital } : prev.hospital,
      };
      next.full_name = `${next.first_name ?? ''} ${next.last_name ?? ''}`.trim() || next.full_name;
      const session = loadAuthSession();
      if (tokenRef.current) saveAuthSession(tokenRef.current, next, session?.refreshToken);
      return next;
    });
  }, []);

  const refreshPermissions = useCallback(async () => {
    const epochAtStart = currentSessionEpoch();
    const accessToken = tokenRef.current || loadAuthSession()?.token;
    if (!accessToken || isTokenExpired(accessToken)) return null;
    try {
      const me = await getCurrentUser(accessToken);
      if (!isSessionCurrent(epochAtStart)) return null;
      const session = loadAuthSession();
      const previous = userRef.current ?? session?.user ?? null;
      const profile = mergeAuthenticatedProfile(
        previous,
        me,
        { permissions: previous?.permissions, role: previous?.role },
        accessToken,
        resolvePermissions
      );
      const samePermissions = Array.isArray(previous?.permissions)
        && previous.permissions.length === profile.permissions.length
        && profile.permissions.every((permission, index) => String(previous.permissions[index]) === String(permission));
      const sameHospital = previous?.hospital?.id === profile.hospital?.id
        && previous?.hospital?.name === profile.hospital?.name
        && previous?.hospital?.code === profile.hospital?.code
        && previous?.tenant_id === profile.tenant_id
        && (previous?.user_id ?? previous?.id) === (profile.user_id ?? profile.id)
        && previous?.role === profile.role;
      if (samePermissions && sameHospital && !identitiesDiffer(previous, profile)) {
        return null;
      }
      adoptHospitalProfile(profile, previous, accessToken, session?.refreshToken);
      return profile.permissions;
    } catch (err) {
      if (!isSessionCurrent(epochAtStart) || isSupersededSessionError(err) || err?.code === 'invalid_tenant' || err?.code === 'platform_realm') {
        return null;
      }
      if (isTerminalSessionError(err)) {
        const kind = classifyForbidden(err?.detail || err?.message);
        logout({
          message: messageForSessionError(err),
          notifyServer: sessionCleanupNotifiesServer(kind),
        });
      }
      return null;
    }
  }, [adoptHospitalProfile, logout]);

  const login = useCallback(async (credentials, options = {}) => {
    const issuedSession = options?.issuedSession?.access_token ? options.issuedSession : null;
    clearSessionNotice();
    setError(null);

    const previousToken = tokenRef.current || loadAuthSession()?.token || null;
    const previousUser = userRef.current || loadAuthSession()?.user || null;
    const epochAtStart = beginNewSessionEpoch();
    setUser(null);
    setToken(null);

    let logoutRequest = Promise.resolve(null);
    if (previousToken && !isLegacyDemoSuperAdminToken(previousToken)) {
      try {
        logoutRequest = requestHospitalLogout(previousToken);
      } catch {
        logoutRequest = Promise.resolve(null);
      }
    }
    cleanupHospitalState();
    logoutRequest.catch(() => null);

    let accessToken = null;
    try {
      const data = issuedSession ?? await apiLogin(credentials);
      if (!isSessionCurrent(epochAtStart)) {
        const replaced = new Error('Sign-in was replaced');
        replaced.code = 'session_superseded';
        throw replaced;
      }

      accessToken = data?.access_token;
      const refreshToken = data?.refresh_token;
      if (!accessToken) {
        throw new Error('Invalid email or password');
      }

      // Platform accounts stay on the platform client. Never adopt them here.
      if (isPlatformLoginRole(data?.role)) {
        const realmError = new Error('This account cannot use hospital sign-in.');
        realmError.status = 403;
        realmError.code = 'platform_realm';
        throw realmError;
      }

      const me = await getCurrentUser(accessToken);
      if (!isSessionCurrent(epochAtStart)) {
        const replaced = new Error('Sign-in was replaced');
        replaced.code = 'session_superseded';
        throw replaced;
      }

      const profile = mergeAuthenticatedProfile(null, me, data, accessToken, resolvePermissions);
      if (!profile.department) {
        profile.department = DEPARTMENT_BY_ROLE[normalizeRole(profile.role)] ?? 'OPD';
      }
      if (identitiesDiffer(previousUser, profile)) {
        cleanupHospitalState();
      }
      return adoptHospitalProfile(profile, previousUser, accessToken, refreshToken);
    } catch (err) {
      if (err?.code === 'invalid_tenant' || err?.code === 'platform_realm') {
        throw err;
      }
      if (isSupersededSessionError(err) || !isSessionCurrent(epochAtStart)) {
        if (isSupersededSessionError(err)) throw err;
        const replaced = new Error('Sign-in was replaced');
        replaced.code = 'session_superseded';
        throw replaced;
      }
      if (err?.code !== 'invalid_tenant' && err?.code !== 'platform_realm') {
        cleanupHospitalState();
        setUser(null);
        setToken(null);
      }
      const message = err?.status === 401
        ? err?.message || 'Invalid email or password'
        : err?.message || 'Unable to sign in. Please try again.';
      if (err?.code === 'invalid_tenant' || isTerminalSessionError(err)) {
        publishSessionNotice(message);
      }
      setError(message);
      throw Object.assign(new Error(message), {
        status: err?.status,
        code: err?.code,
        detail: err?.detail,
      });
    }
  }, [adoptHospitalProfile, cleanupHospitalState]);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const epochAtStart = currentSessionEpoch();
      const session = loadAuthSession();
      if (!session?.token && !session?.refreshToken) {
        if (!cancelled) setAuthReady(true);
        return;
      }

      if (isLegacyDemoSuperAdminToken(session.token) || session.user?.isDemoSession) {
        cleanupHospitalState();
        if (!cancelled) setAuthReady(true);
        return;
      }

      let accessToken = session.token;
      let refreshToken = session.refreshToken;

      try {
        const resolved = await Promise.race([
          fetchValidAccessToken(session),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('session restore timeout')), SESSION_RESTORE_TIMEOUT_MS);
          }),
        ]);

        if (cancelled || !isSessionCurrent(epochAtStart)) return;

        if (!resolved) {
          logout({
            message: resolveSessionFailure('refresh_failed').message,
            notifyServer: false,
          });
          return;
        }

        if (typeof resolved === 'string') {
          accessToken = resolved;
        } else {
          accessToken = resolved.accessToken;
          refreshToken = resolved.refreshToken;
        }

        const me = await getCurrentUser(accessToken);
        if (cancelled || !isSessionCurrent(epochAtStart)) return;

        const profile = mergeAuthenticatedProfile(
          null,
          me,
          { permissions: session.user?.permissions, role: session.user?.role },
          accessToken,
          resolvePermissions
        );
        let activeEpoch = epochAtStart;
        if (identitiesDiffer(session.user, profile)) {
          activeEpoch = beginNewSessionEpoch();
          setUser(null);
          cleanupHospitalState();
        }
        if (cancelled || !isSessionCurrent(activeEpoch)) return;
        adoptHospitalProfile(profile, session.user, accessToken, refreshToken);
      } catch (err) {
        if (cancelled || !isSessionCurrent(epochAtStart) || isSupersededSessionError(err)) return;
        if (err?.code === 'invalid_tenant' || err?.code === 'platform_realm') return;
        if (isTerminalSessionError(err)) {
          const kind = classifyForbidden(err?.detail || err?.message);
          logout({
            message: messageForSessionError(err),
            notifyServer: sessionCleanupNotifiesServer(kind),
          });
          return;
        }
        if (
          session.user
          && accessToken
          && !isTokenExpired(accessToken)
          && isValidTenantId(session.user.tenant_id)
        ) {
          rememberHospitalScope(session.user);
          setToken(accessToken);
          setUser(session.user);
          return;
        }
        logout({ notifyServer: false });
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [adoptHospitalProfile, cleanupHospitalState, logout]);

  useEffect(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!token || isTokenExpired(token)) return undefined;

    const expiresIn = getTokenExpiresInMs(token);
    const refreshIn = Math.max(expiresIn - TOKEN_REFRESH_BUFFER_MS, 0);

    refreshTimerRef.current = setTimeout(() => {
      refreshSession().catch(() => {});
    }, refreshIn);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [token, refreshSession]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      error,
      isAuthenticated,
      authReady,
      login,
      logout,
      updateUser,
      refreshPermissions,
      refreshSession,
      applyTokens,
    }),
    [
      user,
      token,
      loading,
      error,
      isAuthenticated,
      authReady,
      login,
      logout,
      updateUser,
      refreshPermissions,
      refreshSession,
      applyTokens,
    ]
  );

  useEffect(() => {
    setAuthRef({
      ...value,
      getState: () => getAuthRef(),
    });
  }, [value]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook stays beside the provider so session state is not duplicated.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
