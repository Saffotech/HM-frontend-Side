import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import IpdLayout from './IpdLayout';

function IpdPermissionSync({ children }) {
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

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    const id = window.setInterval(sync, 15_000);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(id);
    };
  }, [isAuthenticated, refreshPermissions]);

  return children;
}

export default function IpdAppShell() {
  return (
    <IpdPermissionSync>
      <IpdLayout>
        <Outlet />
      </IpdLayout>
    </IpdPermissionSync>
  );
}
