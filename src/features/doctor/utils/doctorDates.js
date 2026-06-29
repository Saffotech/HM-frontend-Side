export function formatOpdDate(date = new Date()) {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** UI date "08 Jun 2026" → "2026-06-08" for `<input type="date">` */
export function uiDateToIsoInput(uiDate) {
  const d = parseOpdDateString(uiDate);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** ISO "2026-06-08" → UI date "08 Jun 2026" */
export function isoInputToUiDate(iso) {
  if (!iso) return todayOpdDate();
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return todayOpdDate();
  return formatOpdDate(new Date(y, m - 1, d));
}

export function todayOpdDate() {
  return formatOpdDate();
}

export function isTodayAppointment(appt) {
  return appt.date === todayOpdDate();
}

export function uid(prefix = '') {
  return prefix + Date.now().toString(36).slice(2, 7).toUpperCase();
}

/** Parse OPD display date e.g. "01 Jun 2026" (en-GB) */
export function parseOpdDateString(dateStr) {
  if (!dateStr) return new Date();
  const parts = String(dateStr).trim().split(/\s+/);
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const year = parseInt(parts[parts.length - 1], 10);
    const monthStr = parts.slice(1, -1).join(' ');
    const parsed = new Date(`${monthStr} ${day}, ${year}`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const fallback = new Date(dateStr);
  return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
}

/** Parse time e.g. "9:00 AM", "08:30 AM", or API "10:30:00" */
export function parseAppointmentTimeString(timeStr) {
  const raw = String(timeStr || '').trim();
  const match12 = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridiem = match12[3].toUpperCase();
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return { hours, minutes };
  }
  const match24 = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    return {
      hours: parseInt(match24[1], 10),
      minutes: parseInt(match24[2], 10),
    };
  }
  return { hours: 0, minutes: 0 };
}

/** Combined appointment date + time for sorting */
export function getAppointmentDateTime(appt) {
  if (appt?.scheduledAt) {
    const scheduled = new Date(appt.scheduledAt).getTime();
    if (!Number.isNaN(scheduled)) return scheduled;
  }
  const base = parseOpdDateString(appt?.date);
  const { hours, minutes } = parseAppointmentTimeString(appt?.time);
  base.setHours(hours, minutes, 0, 0);
  return base.getTime();
}

export function compareAppointmentsByDateTime(a, b) {
  return getAppointmentDateTime(a) - getAppointmentDateTime(b);
}

/** Display as 08:30 AM, 09:00 AM */
export function formatAppointmentTimeDisplay(timeStr) {
  const raw = String(timeStr || '').trim();
  if (!raw) return '—';
  const { hours, minutes } = parseAppointmentTimeString(raw);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
