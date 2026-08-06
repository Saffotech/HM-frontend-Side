import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';

export const LAB_PERMISSIONS_BUMP_KEY = 'hms:lab-permissions-bump';

function LabPermissionSync({ children }) {
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
      if (event.key === LAB_PERMISSIONS_BUMP_KEY) sync();
    };
    const onBump = () => sync();

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('storage', onStorage);
    window.addEventListener('hms:lab-permissions-bump', onBump);
    const id = window.setInterval(sync, 15_000);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('hms:lab-permissions-bump', onBump);
      window.clearInterval(id);
    };
  }, [isAuthenticated, refreshPermissions]);

  return children;
}

/** Lab routes shell */
export default function LabAppShell() {
  return (
    <LabPermissionSync>
      <Outlet />
    </LabPermissionSync>
  );
}
