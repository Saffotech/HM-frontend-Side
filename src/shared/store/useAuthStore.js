/**
 * Backward-compatible auth hook — backed by AuthContext (sessionStorage session).
 */

import { useAuth } from '@/shared/hooks/useAuth';
import { getAuthRef } from '@/components/security/authRef';

export function useAuthStore(selector) {
  const auth = useAuth();
  if (typeof selector === 'function') {
    return selector(auth);
  }
  return auth;
}

useAuthStore.getState = () => getAuthRef();
