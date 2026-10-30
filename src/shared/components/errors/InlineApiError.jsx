import { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { WIDGET_MESSAGE, userFacingMessage } from '@/shared/errors/errorClassification';
import { runRetry } from '@/shared/errors/retryAction';
import './RecoveryStates.css';

export default function InlineApiError({
  error,
  message,
  onRetry,
  title = WIDGET_MESSAGE,
}) {
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  const copy = message || userFacingMessage(error) || title;

  useEffect(() => () => {
    mounted.current = false;
  }, []);

  async function handleRetry() {
    if (busy || !onRetry) return;
    setBusy(true);
    try {
      await runRetry(false, onRetry);
    } catch {
      /* The next error state stays visible. */
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <div className="recovery-inline" role="alert">
      <span className="recovery-inline__icon" aria-hidden>
        <AlertTriangle size={16} />
      </span>
      <div className="recovery-inline__body">
        <p className="recovery-inline__message">{copy}</p>
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={busy}
            onClick={handleRetry}
          >
            Retry
          </Button>
        ) : null}
      </div>
    </div>
  );
}
