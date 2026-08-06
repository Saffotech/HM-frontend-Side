/**
 * Derivation helpers for the OPD Today's Overview page.
 * Everything here works on data already returned by the existing OPD APIs.
 */

export const TIME_OF_DAY = {
  MORNING: 'Morning',
  AFTERNOON: 'Afternoon',
  EVENING: 'Evening',
};

/** Morning < 12:00, Afternoon < 17:00, Evening after that. */
export function timeOfDayOf(raw) {
  const parsed = raw ? new Date(raw) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return null;
  const hour = parsed.getHours();
  if (hour < 12) return TIME_OF_DAY.MORNING;
  if (hour < 17) return TIME_OF_DAY.AFTERNOON;
  return TIME_OF_DAY.EVENING;
}

export function isToday(raw, reference = new Date()) {
  const parsed = raw ? new Date(raw) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return false;
  return (
    parsed.getFullYear() === reference.getFullYear() &&
    parsed.getMonth() === reference.getMonth() &&
    parsed.getDate() === reference.getDate()
  );
}

export function toTimestamp(raw) {
  const parsed = raw ? new Date(raw) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return 0;
  return parsed.getTime();
}

export function minutesSince(raw, reference = new Date()) {
  const ts = toTimestamp(raw);
  if (!ts) return null;
  return Math.round((reference.getTime() - ts) / 60000);
}

/** Sorted, de-duplicated dropdown options from any list of names. */
export function optionsFromNames(names) {
  const unique = [...new Set(names.filter((name) => name && String(name).trim()))];
  unique.sort((a, b) => String(a).localeCompare(String(b)));
  return unique.map((name) => ({ value: name, label: name }));
}

export function matchesSelection(selected, value) {
  if (!selected || selected === 'all') return true;
  return String(value ?? '') === String(selected);
}

export function matchesTimeOfDay(selected, raw) {
  if (!selected || selected === 'all') return true;
  return timeOfDayOf(raw) === selected;
}

/** Payment status of a bill/visit normalized to Paid | Partial | Unpaid. */
export function normalizePaymentStatus(status, { total, paid, balance } = {}) {
  const key = String(status ?? '').toLowerCase();
  if (key === 'paid') return 'Paid';
  if (key === 'partial') return 'Partial';
  if (key === 'pending' || key === 'unpaid') return 'Unpaid';
  if (key === 'cancelled') return 'Cancelled';
  const dueAmount = Number(balance ?? 0);
  const paidAmount = Number(paid ?? 0);
  if (Number(total ?? 0) > 0 && dueAmount <= 0.01) return 'Paid';
  if (paidAmount > 0) return 'Partial';
  return 'Unpaid';
}

export function sumBy(rows, pick) {
  return rows.reduce((total, row) => total + (Number(pick(row)) || 0), 0);
}

export function formatClockTime(raw) {
  const parsed = raw ? new Date(raw) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatLongDate(date = new Date()) {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatAgeGender(age, gender) {
  const parts = [];
  if (age != null && age !== '') parts.push(`${age} yrs`);
  if (gender) parts.push(gender);
  return parts.length ? parts.join(' / ') : '—';
}
