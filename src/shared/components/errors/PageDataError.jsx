import { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { userFacingMessage } from '@/shared/errors/errorClassification';
import { runRetry } from '@/shared/errors/retryAction';
import './RecoveryStates.css';

export default function PageDataError({
  error,
  message,
  onRetry,
  onSecondary,
  secondaryLabel,
  title = 'Unable to load this page',
}) {
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  const copy = message || userFacingMessage(error) || 'The information on this page could not be loaded.';

  useEffect(() => () => {
    mounted.current = false;
  }, []);

  async function handleRetry() {
    if (busy || !onRetry) return;
    setBusy(true);
    try {
      await runRetry(false, onRetry);
    } catch {
      /* Keep the error visible when the retry fails. */
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <div className="recovery-page">
      <div className="recovery-card" role="alert">
        <span className="recovery-card__icon" aria-hidden>
          <AlertTriangle size={22} />
        </span>
        <h2 className="recovery-card__title">{title}</h2>
        <p className="recovery-card__text">{copy}</p>
        <div className="recovery-actions">
          {onRetry ? (
            <Button type="button" loading={busy} onClick={handleRetry}>
              Retry
            </Button>
          ) : null}
          {onSecondary ? (
            <Button type="button" variant="outline" onClick={onSecondary} disabled={busy}>
              {secondaryLabel || 'Continue'}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
