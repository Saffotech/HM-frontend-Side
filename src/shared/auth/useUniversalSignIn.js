import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/useAuthStore';
import { isStaffModuleLive } from '@/shared/constants/moduleAvailability';
import { completeUniversalSignIn } from '@/shared/auth/completeUniversalSignIn';
import { signOutPlatform } from '@/features/Platform Admin/shared/api/platformAuth';
import {
  clearStoredPortalProfiles,
  readActivePortalSession,
} from '@/features/Platform Admin/shared/api/platformSession';

/**
 * Shared /login action. Hospital credentials continue through AuthContext.
 * Platform, CRM, and accountant credentials stop at the platform session.
 */
export function useUniversalSignIn() {
  const { login, logout } = useAuthStore();
  const location = useLocation();
  const from = location.state?.from;

  const signIn = useCallback(async (credentials) => {
    const result = await completeUniversalSignIn(credentials, {
      from,
      hospitalLogin: (creds, options) => login(creds, options),
      hospitalLogout: (options = {}) => logout({ notifyServer: true, ...options }),
    });
    if (
      result.realm === 'hospital'
      && !isStaffModuleLive(result.profile?.department, result.profile?.role)
    ) {
      await logout();
      const blocked = `${result.profile?.department || 'This module'} is not available yet.`;
      const error = new Error(blocked);
      error.code = 'module_unavailable';
      throw error;
    }
    return result;
  }, [from, login, logout]);

  const signOutEverywhere = useCallback(() => {
    logout({ notifyServer: true });
    void signOutPlatform();
    clearStoredPortalProfiles();
  }, [logout]);

  return {
    signIn,
    signOutEverywhere,
    activePortal: readActivePortalSession(),
  };
}
