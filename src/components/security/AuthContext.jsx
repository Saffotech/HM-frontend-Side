import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { login as apiLogin, getCurrentUser, refreshAccessToken } from '@/shared/api/auth';

import { setAuthRef, getAuthRef } from '@/components/security/authRef';

import {

  loadAuthSession,

  saveAuthSession,

  clearAuthSession,

} from '@/components/security/authSession';

import { decodeJwt, isTokenExpired, getTokenExpiresInMs } from '@/shared/utils/jwtHelper';

import { normalizeRole, DEPARTMENT_BY_ROLE } from '@/shared/utils/roleUtils';

function isLegacyDemoSuperAdminToken(token) {
  if (!token) return false;
  if (String(token).endsWith('.demo')) return true;
  const payload = decodeJwt(token);
  return Boolean(payload?.demo);
}



const AuthContext = createContext(null);

const SESSION_RESTORE_TIMEOUT_MS = 15000;

const TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000;



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



function buildUserProfile(me, loginData, accessToken) {

  const profile = { ...me };

  profile.id = profile.id ?? profile.user_id;

  profile.role = normalizeRole(profile.role ?? loginData?.role);

  profile.permissions = resolvePermissions(loginData, accessToken);

  profile.full_name =

    `${profile.first_name ?? loginData?.first_name ?? ''} ${profile.last_name ?? ''}`.trim();

  if (!profile.department) {

    profile.department = DEPARTMENT_BY_ROLE[profile.role] ?? 'OPD';

  }

  return profile;

}



function buildAuthenticated(user, token) {

  return Boolean(token && user && !isTokenExpired(token));

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



export function AuthProvider({ children }) {

  const [user, setUser] = useState(null);

  const [token, setToken] = useState(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState(null);

  const [authReady, setAuthReady] = useState(false);

  const refreshTimerRef = useRef(null);



  const isAuthenticated = buildAuthenticated(user, token);



  const applyTokens = useCallback((accessToken, refreshToken) => {
    setToken(accessToken);
    const session = loadAuthSession();
    const nextUser = session?.user;
    if (nextUser) {
      saveAuthSession(accessToken, nextUser, refreshToken);
      setUser(nextUser);
    }
  }, []);



  const logout = useCallback(() => {

    if (refreshTimerRef.current) {

      clearTimeout(refreshTimerRef.current);

      refreshTimerRef.current = null;

    }

    clearAuthSession();

    setUser(null);

    setToken(null);

    setError(null);

    setLoading(false);

  }, []);



  const refreshSession = useCallback(async () => {

    const session = loadAuthSession();

    if (!session?.refreshToken || isTokenExpired(session.refreshToken)) {

      throw new Error('Refresh token unavailable');

    }



    const data = await refreshAccessToken(session.refreshToken);

    const accessToken = data?.access_token;

    const refreshToken = data?.refresh_token ?? session.refreshToken;

    if (!accessToken) {

      throw new Error('Refresh failed');

    }



    setToken(accessToken);

    setUser((prev) => {

      const nextUser = prev ?? session.user;

      if (nextUser) saveAuthSession(accessToken, nextUser, refreshToken);

      return nextUser;

    });

    return accessToken;

  }, []);



  const updateUser = useCallback(

    (updates) => {

      setUser((prev) => {

        if (!prev) return prev;

        const next = { ...prev, ...updates };

        next.full_name =

          `${next.first_name ?? ''} ${next.last_name ?? ''}`.trim() || next.full_name;

        const session = loadAuthSession();

        if (token) saveAuthSession(token, next, session?.refreshToken);

        return next;

      });

    },

    [token]

  );



  const login = useCallback(async (credentials) => {

    setError(null);

    try {

      const data = await apiLogin(credentials);

      const accessToken = data?.access_token;

      const refreshToken = data?.refresh_token;

      if (!accessToken) {

        throw new Error('Invalid email or password');

      }

      const me = await getCurrentUser(accessToken);

      const profile = buildUserProfile(me, data, accessToken);

      setUser(profile);

      setToken(accessToken);

      saveAuthSession(accessToken, profile, refreshToken);

      return profile;

    } catch (err) {

      const message =

        err?.status === 401

          ? err?.message || 'Invalid email or password'

          : err?.message || 'Unable to sign in. Please try again.';

      setError(message);

      throw Object.assign(new Error(message), { status: err?.status });

    }

  }, []);



  useEffect(() => {

    let cancelled = false;



    async function restoreSession() {

      const session = loadAuthSession();

      if (!session?.token && !session?.refreshToken) {

        if (!cancelled) setAuthReady(true);

        return;

      }

      if (isLegacyDemoSuperAdminToken(session.token) || session.user?.isDemoSession) {
        clearAuthSession();
        if (!cancelled) setAuthReady(true);
        return;
      }

      let accessToken = session.token;

      let refreshToken = session.refreshToken;



      try {

        const resolved = await Promise.race([

          fetchValidAccessToken(session),

          new Promise((_, reject) =>

            setTimeout(() => reject(new Error('session restore timeout')), SESSION_RESTORE_TIMEOUT_MS)

          ),

        ]);



        if (!resolved) {

          clearAuthSession();

          if (!cancelled) setAuthReady(true);

          return;

        }



        if (typeof resolved === 'string') {

          accessToken = resolved;

        } else {

          accessToken = resolved.accessToken;

          refreshToken = resolved.refreshToken;

        }



        const me = await getCurrentUser(accessToken);

        let profile = buildUserProfile(me, { permissions: session.user?.permissions }, accessToken);

        if (!cancelled) {

          setToken(accessToken);

          setUser(profile);

          saveAuthSession(accessToken, profile, refreshToken);

        }

      } catch (err) {

        if (err?.status === 401) {

          clearAuthSession();

          if (!cancelled) {

            setUser(null);

            setToken(null);

          }

        } else if (session.user && accessToken && !isTokenExpired(accessToken)) {

          if (!cancelled) {

            setToken(accessToken);

            setUser(session.user);

          }

        }

      } finally {

        if (!cancelled) setAuthReady(true);

      }

    }



    restoreSession();

    return () => {

      cancelled = true;

    };

  }, []);



  useEffect(() => {

    if (refreshTimerRef.current) {

      clearTimeout(refreshTimerRef.current);

      refreshTimerRef.current = null;

    }



    if (!token || isTokenExpired(token)) return undefined;



    const expiresIn = getTokenExpiresInMs(token);

    const refreshIn = Math.max(expiresIn - TOKEN_REFRESH_BUFFER_MS, 0);



    refreshTimerRef.current = setTimeout(() => {

      refreshSession().catch(() => logout());

    }, refreshIn);



    return () => {

      if (refreshTimerRef.current) {

        clearTimeout(refreshTimerRef.current);

        refreshTimerRef.current = null;

      }

    };

  }, [token, refreshSession, logout]);



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



export function useAuth() {

  const ctx = useContext(AuthContext);

  if (!ctx) {

    throw new Error('useAuth must be used within AuthProvider');

  }

  return ctx;

}


