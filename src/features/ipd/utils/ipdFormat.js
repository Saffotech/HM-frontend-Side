/** Shared IPD display helpers — keep UI formatting out of pages. */

export function formatIpdDateTime(raw) {
  if (!raw) return '—';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toIsoAdmissionDate(dateOnly) {
  if (!dateOnly) return undefined;
  // Backend accepts ISO datetime; noon avoids TZ day-shift for date-only inputs.
  return `${dateOnly}T12:00:00`;
}
