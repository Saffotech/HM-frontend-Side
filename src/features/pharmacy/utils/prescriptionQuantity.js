/**
 * Derive total units to dispense and human-readable instructions from prescription items.
 */

const FREQUENCY_TIMES = [
  ['QID', 4],
  ['4 TIMES', 4],
  ['TDS', 3],
  ['TID', 3],
  ['3 TIMES', 3],
  ['BD', 2],
  ['BID', 2],
  ['TWICE', 2],
  ['2 TIMES', 2],
  ['OD', 1],
  ['ONCE', 1],
  ['DAILY', 1],
  ['HS', 1],
  ['SOS', 1],
];

const DOSE_SCHEDULE_SLOTS = [
  { key: 'morning', label: 'Morning' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'night', label: 'Night' },
];

function firstNumber(value) {
  const match = String(value ?? '').match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 0;
}

/** Parse Indian dose codes like 1-0-1 or 1/1/1. */
export function parseDoseScheduleCode(frequency) {
  const trimmed = String(frequency ?? '').trim();
  const match = trimmed.match(/^(\d+)\s*[-/]\s*(\d+)\s*[-/]\s*(\d+)$/);
  if (!match) return null;

  return {
    morning: Number.parseInt(match[1], 10) || 0,
    afternoon: Number.parseInt(match[2], 10) || 0,
    night: Number.parseInt(match[3], 10) || 0,
  };
}

/** Convert 1-0-1 → "1 Morning, 1 Night". */
export function formatDoseScheduleInstructions(schedule) {
  if (!schedule) return '';

  const parts = DOSE_SCHEDULE_SLOTS.filter(({ key }) => schedule[key] > 0).map(
    ({ key, label }) => `${schedule[key]} ${label}`
  );

  return parts.join(', ');
}

/** Infer tablet/capsule/etc. from medicine name. */
export function inferMedicineUnit(medicineName, count = 2) {
  const lower = String(medicineName ?? '').toLowerCase();

  if (/\bsyrup\b|\bsuspension\b|\bdrops\b/.test(lower)) return count === 1 ? 'Dose' : 'Doses';
  if (/\binjection\b|\binj\b|\bampoule\b/.test(lower)) return count === 1 ? 'Injection' : 'Injections';
  if (/\bcapsule\b|\bcap\b/.test(lower)) return count === 1 ? 'Capsule' : 'Capsules';
  if (/\bcream\b|\bointment\b|\bgel\b|\blotion\b/.test(lower)) return count === 1 ? 'Tube' : 'Tubes';

  return count === 1 ? 'Tablet' : 'Tablets';
}

/** Format count with unit label, e.g. "6 Tablets". */
export function formatQuantityLabel(count, medicineName) {
  const n = Number(count);
  if (!Number.isFinite(n)) return '—';
  return `${n} ${inferMedicineUnit(medicineName, n)}`;
}

/** Dose amount per administration when not using a dose schedule code. */
export function parseDoseAmount(dosage) {
  const text = String(dosage ?? '').trim();
  if (!text) return 1;

  const schedule = parseDoseScheduleCode(text);
  if (schedule) {
    return schedule.morning + schedule.afternoon + schedule.night || 1;
  }

  const n = firstNumber(text);
  return n > 0 ? n : 1;
}

/** Daily administrations from frequency text or dose schedule. */
export function parseTimesPerDay(frequency) {
  const schedule = parseDoseScheduleCode(frequency);
  if (schedule) {
    const total = schedule.morning + schedule.afternoon + schedule.night;
    return total > 0 ? total : 1;
  }

  const upper = String(frequency ?? '').trim().toUpperCase();
  if (!upper) return 1;

  for (const [token, times] of FREQUENCY_TIMES) {
    if (upper.includes(token)) return times;
  }

  const n = firstNumber(frequency);
  return n > 0 ? n : 1;
}

/** Total units prescribed for the full course. */
export function computePrescribedQuantity(item) {
  if (!item) return 0;

  const explicit = Number(item.quantity);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const schedule = parseDoseScheduleCode(item.frequency);
  const days = Math.max(Number(item.duration) || 0, 1);

  if (schedule) {
    const daily = schedule.morning + schedule.afternoon + schedule.night;
    return daily * days;
  }

  const dose = parseDoseAmount(item.dosage);
  const times = parseTimesPerDay(item.frequency);
  return dose * times * days;
}

/**
 * Plain-language instructions for pharmacists.
 * e.g. "1 Morning, 1 Night for 3 Days"
 */
export function formatHumanInstructions(item) {
  if (!item) return '—';

  const explicit = String(item.instructions ?? '').trim();
  const days = Number(item.duration) || 0;
  const schedule = parseDoseScheduleCode(item.frequency);

  if (schedule) {
    const timing = formatDoseScheduleInstructions(schedule);
    if (timing && days > 0) {
      return `${timing} for ${days} Day${days === 1 ? '' : 's'}`;
    }
    if (timing) return timing;
  }

  const frequency = String(item.frequency ?? '').trim();
  const dosage = String(item.dosage ?? '').trim();

  if (explicit) {
    if (days > 0 && !explicit.toLowerCase().includes('day')) {
      return `${explicit} for ${days} Day${days === 1 ? '' : 's'}`;
    }
    return explicit;
  }

  const parts = [];
  if (dosage) parts.push(dosage);
  if (frequency && !parseDoseScheduleCode(frequency)) parts.push(frequency);
  if (days > 0) parts.push(`${days} Day${days === 1 ? '' : 's'}`);

  return parts.length ? parts.join(', ') : 'As directed';
}

/** @deprecated Use formatHumanInstructions for dispense UI. */
export function formatMedicineSchedule(item) {
  return formatHumanInstructions(item);
}

/** Summary label for footer totals across one or more medicines. */
export function formatSummaryQuantity(count, medicineNames = []) {
  const n = Number(count);
  if (!Number.isFinite(n)) return '—';

  const uniqueUnits = new Set(
    (medicineNames ?? [])
      .filter(Boolean)
      .map((name) => inferMedicineUnit(name, n))
  );

  if (uniqueUnits.size === 1) {
    return formatQuantityLabel(n, medicineNames[0]);
  }

  return n === 1 ? '1 Unit' : `${n} Units`;
}
