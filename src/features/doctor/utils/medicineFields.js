import {
  DEFAULT_MEDICINE,
  MEDICINE_INSTRUCTIONS_MAX,
} from '@/features/doctor/constants';

/** Fresh empty medicine row for consult / edit forms. */
export function emptyMedicineRow() {
  return {
    ...DEFAULT_MEDICINE,
    instructions: '',
    durationValue: '',
    durationUnit: 'Days',
  };
}

/** Parse API duration ('5 Days' | 5 | '5') → UI durationValue + durationUnit. */
export function parseDurationFields(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return { durationValue: '', durationUnit: 'Days' };
  const match = text.match(/^(\d+)\s*(days?|weeks?|months?)?$/i);
  if (match) {
    const unitRaw = (match[2] || 'Days').toLowerCase();
    let durationUnit = 'Days';
    if (unitRaw.startsWith('week')) durationUnit = 'Weeks';
    else if (unitRaw.startsWith('month')) durationUnit = 'Months';
    return { durationValue: match[1], durationUnit };
  }
  const digits = text.match(/(\d+)/);
  return { durationValue: digits ? digits[1] : '', durationUnit: 'Days' };
}

/** UI duration fields → API duration string, e.g. '5 Days'. */
export function formatDurationForApi(m) {
  const value = String(m?.durationValue ?? '').trim();
  if (value) {
    const n = parseInt(value, 10);
    if (Number.isFinite(n) && n > 0) {
      const unit = String(m?.durationUnit ?? 'Days').trim() || 'Days';
      return `${n} ${unit}`;
    }
  }
  const legacy = String(m?.duration ?? '').trim();
  if (legacy) {
    const n = parseInt(legacy, 10);
    if (Number.isFinite(n) && n > 0) {
      if (/days?|weeks?|months?/i.test(legacy)) return legacy;
      return `${n} Days`;
    }
  }
  return '';
}

function nullToEmpty(value) {
  if (value == null) return '';
  return String(value);
}

/** API prescription item → UI medicine row. */
export function medicineRowFromApi(item = {}) {
  const { durationValue, durationUnit } = parseDurationFields(item.duration);
  return {
    name: item.medicine_name ?? item.name ?? '',
    dosage: nullToEmpty(item.dosage),
    form: nullToEmpty(item.form),
    route: nullToEmpty(item.route),
    frequency: nullToEmpty(item.frequency),
    timing: nullToEmpty(item.timing),
    duration: item.duration != null ? String(item.duration) : '',
    durationValue,
    durationUnit,
    quantity: item.quantity != null && item.quantity !== '' ? String(item.quantity) : '',
    instructions: nullToEmpty(item.instructions),
  };
}

/** Soft checks only (e.g. consultation: no required medicine fields). */
export function validateMedicineRowOptional(m, index, errs = {}) {
  if (!String(m?.name ?? '').trim()) return errs;
  if (String(m.instructions ?? '').length > MEDICINE_INSTRUCTIONS_MAX) {
    errs[`medInstructions_${index}`] = `Max ${MEDICINE_INSTRUCTIONS_MAX} characters`;
  }
  return errs;
}

/** Validate a named medicine row into errs map (mutates errs). */
export function validateNamedMedicineRow(m, index, errs = {}) {
  if (!String(m?.name ?? '').trim()) return errs;

  if (!String(m.dosage ?? '').trim()) {
    errs[`medDosage_${index}`] = 'Strength is required';
  }
  if (!String(m.form ?? '').trim()) {
    errs[`medForm_${index}`] = 'Form is required';
  }
  if (!String(m.route ?? '').trim()) {
    errs[`medRoute_${index}`] = 'Route is required';
  }
  if (!String(m.frequency ?? '').trim()) {
    errs[`medFrequency_${index}`] = 'Frequency is required';
  }

  const durationValue = parseInt(m.durationValue, 10);
  if (!durationValue || durationValue <= 0) {
    errs[`medDuration_${index}`] = 'Duration must be a number greater than 0';
  }
  if (!String(m.durationUnit ?? '').trim()) {
    errs[`medDurationUnit_${index}`] = 'Duration unit is required';
  }

  const qty = parseInt(m.quantity, 10);
  if (!Number.isFinite(qty) || qty < 1) {
    errs[`medQuantity_${index}`] = 'Quantity must be at least 1';
  }

  if (String(m.instructions ?? '').length > MEDICINE_INSTRUCTIONS_MAX) {
    errs[`medInstructions_${index}`] = `Max ${MEDICINE_INSTRUCTIONS_MAX} characters`;
  }

  return errs;
}

/** Clear all med* error keys for a row index. */
export function clearMedicineRowErrors(prev, index) {
  const next = { ...prev };
  Object.keys(next).forEach((key) => {
    if (key.startsWith('med') && key.endsWith(`_${index}`)) {
      delete next[key];
    }
  });
  return next;
}

export function dash(value) {
  if (value == null || String(value).trim() === '') return '—';
  return String(value);
}
