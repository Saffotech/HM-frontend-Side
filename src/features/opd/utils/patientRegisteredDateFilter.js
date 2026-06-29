/** OPD patient list — filter by registration date */

export const REGISTRATION_DATE_FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'before_yesterday', label: 'Before yesterday' },
  { id: 'custom', label: 'Custom' },
];

export function parseRegisteredDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function matchesRegistrationDateFilter(patient, filterId, customDate) {
  if (!filterId || filterId === 'all') return true;

  const registered = parseRegisteredDate(patient.registeredDate);
  if (!registered) return filterId !== 'custom';

  const regKey = dateKey(startOfDay(registered));
  const now = new Date();
  const today = startOfDay(now);
  const todayKey = dateKey(today);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dateKey(yesterday);

  switch (filterId) {
    case 'today':
      return regKey === todayKey;
    case 'yesterday':
      return regKey === yesterdayKey;
    case 'before_yesterday':
      return regKey < yesterdayKey;
    case 'custom': {
      if (!customDate) return true;
      const custom = parseRegisteredDate(customDate);
      if (!custom) return true;
      return regKey === dateKey(startOfDay(custom));
    }
    default:
      return true;
  }
}
