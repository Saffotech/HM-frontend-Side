import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';

export const PHARMACY_PERMISSIONS_BUMP_KEY = 'hms:pharmacy-permissions-bump';

function PharmacyPermissionSync({ children }) {
  const { refreshPermissions, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || typeof refreshPermissions !== 'function') return undefined;

    const sync = () => {
      refreshPermissions();
    };

    sync();

    const onFocus = () => sync();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') sync();
    };
    const onStorage = (event) => {
      if (event.key === PHARMACY_PERMISSIONS_BUMP_KEY) sync();
    };
    const onBump = () => sync();

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('storage', onStorage);
    window.addEventListener('hms:pharmacy-permissions-bump', onBump);
    const id = window.setInterval(sync, 15_000);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('hms:pharmacy-permissions-bump', onBump);
      window.clearInterval(id);
    };
  }, [isAuthenticated, refreshPermissions]);

  return children;
}

/** Pharmacy routes shell */
export default function PharmacyAppShell() {
  return (
    <PharmacyPermissionSync>
      <Outlet />
    </PharmacyPermissionSync>
  );
}
