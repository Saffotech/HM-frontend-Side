/**
 * OPD date helpers — align UI display dates with API ISO timestamps (IST).
 */

const IST_OFFSET = '+05:30';

/** Start/end of local calendar day as ISO strings for FastAPI date_from / date_to. */
export function getLocalDayRangeIso(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return {
    dateFrom: `${y}-${m}-${d}T00:00:00${IST_OFFSET}`,
    dateTo: `${y}-${m}-${d}T23:59:59${IST_OFFSET}`,
    dateKey: `${y}-${m}-${d}`,
  };
}

export function getTodayRangeIso() {
  return getLocalDayRangeIso(new Date());
}

/** Normalize API date to en-GB display used across OPD UI (e.g. "05 Jun 2026"). */
export function formatOpdDisplayDate(raw) {
  if (raw == null || raw === '') return '—';
  if (typeof raw === 'string' && !raw.includes('T') && !/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return String(raw);
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Compare display or ISO dates on calendar day in local timezone. */
export function isSameOpdCalendarDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) {
    return formatOpdDisplayDate(a) === formatOpdDisplayDate(b);
  }
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function formatOpdDisplayTime(isoOrDate) {
  if (!isoOrDate) return '—';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Date + time for tables (e.g. "04 Jun 2026, 4:06 PM"). */
export function formatOpdDisplayDateTime(raw) {
  if (raw == null || raw === '') return '—';
  if (typeof raw === 'string' && !raw.includes('T') && !/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return String(raw);
  const datePart = parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timePart = parsed.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart}, ${timePart}`;
}
