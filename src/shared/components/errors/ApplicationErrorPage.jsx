import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import { runRetry } from '@/shared/errors/retryAction';
import './RecoveryStates.css';

export default function ApplicationErrorPage({
  title = 'Something went wrong',
  message = 'This page ran into a problem. You can try again, or return to your dashboard.',
  onRetry,
  onHome,
  homeLabel = 'Go to my dashboard',
  recovering = false,
  tone = 'warning',
}) {
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  useEffect(() => () => {
    mounted.current = false;
  }, []);

  async function handleRetry() {
    if (busy || recovering || !onRetry) return;
    setBusy(true);
    try {
      await runRetry(false, onRetry);
    } catch {
      /* Leave the fallback in place. */
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  if (recovering) {
    return (
      <div className="recovery-app">
        <div className="recovery-status" role="status" aria-live="polite">
          <p>Updating SaffoCare…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recovery-app">
      <div className={`recovery-card${tone === 'critical' ? ' recovery-card--critical' : ''}`} role="alert">
        <span className="recovery-card__icon" aria-hidden>
          {tone === 'critical' ? <AlertTriangle size={22} /> : <RefreshCw size={22} />}
        </span>
        <h1 className="recovery-card__title">{title}</h1>
        <p className="recovery-card__text">{message}</p>
        <div className="recovery-actions">
          {onRetry ? (
            <Button type="button" loading={busy} onClick={handleRetry}>
              Retry
            </Button>
          ) : null}
          {onHome ? (
            <Button type="button" variant="outline" onClick={onHome} disabled={busy}>
              {homeLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
