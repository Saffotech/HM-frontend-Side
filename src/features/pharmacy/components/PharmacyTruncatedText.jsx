import { useState } from 'react';
import './PharmacyTruncatedText.css';

/**
 * Truncates long cell text with "…". Hover shows native tooltip; click toggles full text.
 */
export default function PharmacyTruncatedText({
  text,
  maxLength = 40,
  className = '',
  emptyLabel = '—',
}) {
  const raw = text?.trim() ?? '';
  const isEmpty = !raw;
  const value = isEmpty ? emptyLabel : raw;
  const needsTruncate = !isEmpty && raw.length > maxLength;
  const [expanded, setExpanded] = useState(false);

  if (!needsTruncate) {
    return <span className={className}>{value}</span>;
  }

  const display = expanded ? raw : `${raw.slice(0, maxLength)}…`;

  return (
    <button
      type="button"
      className={`pharmacy-truncated-text ${expanded ? 'is-expanded' : ''} ${className}`.trim()}
      title={expanded ? undefined : raw}
      aria-label={expanded ? 'Collapse full text' : `Show full text: ${raw}`}
      aria-expanded={expanded}
      onClick={() => setExpanded((open) => !open)}
    >
      {display}
    </button>
  );
}
