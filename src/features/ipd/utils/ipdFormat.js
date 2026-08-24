/** Shared IPD display helpers — keep UI formatting out of pages. */

const IST_TIME_ZONE = 'Asia/Kolkata';
const IST_OFFSET = '+05:30';

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

/** Current wall-clock time in Asia/Kolkata as HH:mm:ss. */
function currentIstTimeParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('hour')}:${get('minute')}:${get('second')}`;
}

/**
 * Build admission_date for POST /ipd/admissions.
 * Uses the selected calendar date + the actual current IST time (not noon).
 * Backdated / future dates keep the chosen day and stamp the submit clock time.
 */
export function toIsoAdmissionDate(dateOnly, now = new Date()) {
  if (!dateOnly) return undefined;
  const day = String(dateOnly).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return undefined;
  return `${day}T${currentIstTimeParts(now)}${IST_OFFSET}`;
}
