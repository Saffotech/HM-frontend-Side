import { useState } from 'react';
import './PharmacyTruncatedText.css';

/**
 * Truncates long cell text with "…".
 * Hover shows full text with transparent background (no dark popup).
 * Click pins / unpins the expanded view.
 */
export default function PharmacyTruncatedText({
  text,
  maxLength = 40,
  className = '',
  emptyLabel = '—',
}) {
  const raw = String(text ?? '').trim();
  const isEmpty = !raw;
  const value = isEmpty ? emptyLabel : raw;
  const needsTruncate = !isEmpty && raw.length > maxLength;
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);

  if (!needsTruncate) {
    return <span className={className}>{value}</span>;
  }

  const showFull = expanded || hovered;
  const display = showFull ? raw : `${raw.slice(0, maxLength).trimEnd()}…`;

  return (
    <button
      type="button"
      className={`pharmacy-truncated-text ${showFull ? 'is-expanded' : ''} ${className}`.trim()}
      aria-label={expanded ? 'Collapse full text' : 'Show full text'}
      aria-expanded={showFull}
      onClick={() => setExpanded((open) => !open)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      {display}
    </button>
  );
}
