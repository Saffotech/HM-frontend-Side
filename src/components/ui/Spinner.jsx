import { Loader2 } from 'lucide-react';
import './Spinner.css';

export default function Spinner({
  size = 24,
  label = 'Loading',
  className = '',
  fullPage = false,
}) {
  const content = (
    <div
      className={`ui-spinner ${fullPage ? 'ui-spinner--page' : ''} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 size={size} className="ui-spinner__icon" aria-hidden />
      <span className="ui-spinner__label">{label}</span>
    </div>
  );

  return content;
}
