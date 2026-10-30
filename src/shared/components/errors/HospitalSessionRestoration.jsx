import { useEffect, useState } from 'react';
import {
  decideBfcacheAction,
  markBfcacheReload,
  readBfcacheReloadAt,
} from '@/shared/errors/bfcacheRecovery';
import OfflineRecoveryScreen from './OfflineRecoveryScreen';

export default function HospitalSessionRestoration({ children }) {
  const [mode, setMode] = useState('keep');

  useEffect(() => {
    function onPageShow(event) {
      const storage = window.sessionStorage;
      const decision = decideBfcacheAction({
        persisted: Boolean(event.persisted),
        online: navigator.onLine,
        now: Date.now(),
        lastReloadAt: readBfcacheReloadAt(storage),
      });
      if (decision === 'reload') {
        markBfcacheReload(storage, Date.now());
        window.location.reload();
        return;
      }
      if (decision === 'offline' || decision === 'safe') {
        setMode(decision);
      }
    }

    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  if (mode === 'offline') {
    return (
      <OfflineRecoveryScreen
        onRetry={() => {
          if (!navigator.onLine) {
            throw new Error('offline');
          }
          window.location.reload();
        }}
      />
    );
  }

  if (mode === 'safe') {
    return (
      <OfflineRecoveryScreen
        title="Confirm your session"
        message="This page was restored from the browser history. Refresh to continue with your current sign-in."
        onRetry={() => {
          window.location.reload();
        }}
      />
    );
  }

  return children;
}
