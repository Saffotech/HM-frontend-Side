import { useEffect, useRef, useState } from 'react';
import { WifiOff } from 'lucide-react';
import Button from '@/components/ui/Button';
import { runRetry } from '@/shared/errors/retryAction';
import './RecoveryStates.css';

export default function OfflineRecoveryScreen({
  onRetry,
  title = 'You\'re offline',
  message = 'This screen was restored while you were offline. Reconnect, then refresh so SaffoCare can confirm your session.',
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const mounted = useRef(true);

  useEffect(() => () => {
    mounted.current = false;
  }, []);

  async function handleRetry() {
    if (busy) return;
    setBusy(true);
    setNote('');
    const outcome = await runRetry(false, onRetry);
    if (mounted.current && outcome.started && !outcome.ok) {
      setNote('Still offline. Reconnect and try again.');
    }
    if (mounted.current) setBusy(false);
  }

  return (
    <div className="recovery-app">
      <div className="recovery-card" role="alert">
        <span className="recovery-card__icon" aria-hidden>
          <WifiOff size={22} />
        </span>
        <h1 className="recovery-card__title">{title}</h1>
        <p className="recovery-card__text">{note || message}</p>
        <div className="recovery-actions">
          <Button type="button" loading={busy} onClick={handleRetry}>
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}
