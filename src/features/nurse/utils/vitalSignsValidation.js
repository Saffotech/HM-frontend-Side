/**
 * Frontend data-entry limits for vital signs.
 * These are not clinical normal ranges.
 */

export const VITAL_LIMITS = {
  temperature: { min: 80, max: 110, decimals: 1, integer: false, label: 'Temperature', unit: '°F' },
  bp_systolic: { min: 1, max: 300, integer: true, label: 'Systolic', unit: 'mmHg' },
  bp_diastolic: { min: 1, max: 200, integer: true, label: 'Diastolic', unit: 'mmHg' },
  heart_rate: { min: 1, max: 300, integer: true, label: 'Heart rate', unit: 'BPM' },
  respiratory_rate: { min: 1, max: 100, integer: true, label: 'Respiratory rate', unit: '/min' },
  oxygen_saturation: { min: 0, max: 100, integer: true, label: 'SpO₂', unit: '%' },
  blood_sugar: { min: 1, max: 2000, decimals: 1, integer: false, label: 'Blood sugar', unit: 'mg/dL' },
  weight: { min: 0.1, max: 500, decimals: 2, integer: false, label: 'Weight', unit: 'kg' },
  pain_level: { min: 0, max: 10, integer: true, label: 'Pain level', unit: '' },
};

const SCALAR_FIELDS = [
  'temperature',
  'heart_rate',
  'respiratory_rate',
  'oxygen_saturation',
  'blood_sugar',
  'weight',
  'pain_level',
];

function decimalPlaces(text) {
  const fraction = String(text).split('.')[1];
  return fraction ? fraction.length : 0;
}

function precisionMessage(decimals) {
  return decimals === 1
    ? 'Use at most 1 decimal place.'
    : `Use at most ${decimals} decimal places.`;
}

function rangeMessage(key) {
  const rule = VITAL_LIMITS[key];
  const unit = rule.unit ? ` ${rule.unit}` : '';
  return `${rule.label} must be from ${rule.min} to ${rule.max}${unit}.`;
}

export function validateVitalValue(key, raw) {
  const text = String(raw ?? '').trim();
  if (text === '') return '';

  const rule = VITAL_LIMITS[key];
  if (!rule) return '';

  if (rule.integer) {
    if (text.includes('.')) return 'Enter a whole number.';
    if (!/^\d+$/.test(text)) return 'Enter a number.';
  } else if (!/^\d+(\.\d+)?$/.test(text) && !/^\.\d+$/.test(text)) {
    if ((text.match(/\./g) || []).length > 1) return 'Enter one decimal point only.';
    return 'Enter a number.';
  } else if (decimalPlaces(text) > rule.decimals) {
    return precisionMessage(rule.decimals);
  }

  const value = Number(text);
  if (!Number.isFinite(value)) return 'Enter a number.';
  if (value < rule.min || value > rule.max) return rangeMessage(key);
  return '';
}

export function acceptVitalDraft(key, raw, previous = '') {
  const text = String(raw ?? '');
  if (text === '') return { reject: false, value: '', error: '', showNow: false };

  if (/[a-zA-Z]/.test(text)) {
    return { reject: true, error: 'Letters are not allowed.' };
  }
  if (text.includes('-') || text.includes('+')) {
    return { reject: true, error: 'Negative values are not allowed.' };
  }

  const rule = VITAL_LIMITS[key];
  if (rule?.integer && text.includes('.')) {
    return {
      reject: false,
      value: text,
      error: 'Enter a whole number.',
      showNow: true,
    };
  }
  if (rule && !rule.integer && (text.match(/\./g) || []).length > 1) {
    return { reject: true, error: 'Enter one decimal point only.' };
  }

  const allowed = rule?.integer ? /[^\d]/ : /[^\d.]/;
  if (allowed.test(text)) {
    return { reject: true, error: 'Enter numbers only.' };
  }

  const error = validateVitalValue(key, text);
  const inserted = text.length > String(previous ?? '').length + 1;
  const formatError = error === 'Enter a whole number.'
    || error.startsWith('Use at most');
  return {
    reject: false,
    value: text,
    error,
    showNow: Boolean(error) && (inserted || formatError),
  };
}

export function blockedVitalKey(field, current, key, selectionStart = 0, selectionEnd = 0) {
  if (!key || key.length !== 1) return null;
  const rule = VITAL_LIMITS[field];
  if (!rule) return null;
  if (/[a-zA-Z]/.test(key)) return 'Letters are not allowed.';
  if (key === '-' || key === '+') return 'Negative values are not allowed.';
  if (rule.integer && key === '.') return 'Enter a whole number.';
  if (!/^\d$/.test(key) && key !== '.') return 'Enter numbers only.';

  const start = selectionStart ?? 0;
  const end = selectionEnd ?? start;
  const next = `${String(current ?? '').slice(0, start)}${key}${String(current ?? '').slice(end)}`;

  if (!rule.integer && key === '.') {
    const withoutSelection = `${String(current ?? '').slice(0, start)}${String(current ?? '').slice(end)}`;
    if (withoutSelection.includes('.')) return 'Enter one decimal point only.';
    return null;
  }

  if (!rule.integer && next.includes('.')) {
    const fraction = next.split('.')[1] || '';
    if (fraction.length > rule.decimals) return precisionMessage(rule.decimals);
  }
  return null;
}

export function splitBloodPressure(stored) {
  const raw = String(stored ?? '').trim();
  if (!raw) return { systolic: '', diastolic: '' };
  const match = raw.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return { systolic: '', diastolic: '', unparsed: raw };
  return { systolic: match[1], diastolic: match[2] };
}

export function composeBloodPressure(systolic, diastolic) {
  const sys = String(systolic ?? '').trim();
  const dia = String(diastolic ?? '').trim();
  if (!/^\d+$/.test(sys) || !/^\d+$/.test(dia)) return null;
  return `${Number(sys)}/${Number(dia)}`;
}

export function validateVitalsForm(form = {}) {
  const errors = {};

  SCALAR_FIELDS.forEach((key) => {
    const message = validateVitalValue(key, form[key]);
    if (message) errors[key] = message;
  });

  const sys = String(form.bp_systolic ?? '').trim();
  const dia = String(form.bp_diastolic ?? '').trim();
  const stored = String(form.blood_pressure ?? '').trim();

  if (!sys && !dia && stored && splitBloodPressure(stored).unparsed) {
    errors.bp_systolic = 'Enter systolic and diastolic as 120/80.';
  }

  if (sys || dia) {
    const sysError = sys ? validateVitalValue('bp_systolic', sys) : 'Enter systolic and diastolic together.';
    const diaError = dia ? validateVitalValue('bp_diastolic', dia) : 'Enter systolic and diastolic together.';
    if (sysError) errors.bp_systolic = sysError;
    if (diaError) errors.bp_diastolic = diaError;
    if (!sysError && !diaError && Number(sys) <= Number(dia)) {
      errors.bp_systolic = 'Systolic must be greater than diastolic.';
    }
  }

  return { errors, valid: Object.keys(errors).length === 0 };
}

export function isVitalsFormValid(form) {
  return validateVitalsForm(form).valid;
}

function optionalNumber(value) {
  if (value === '' || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** Maps the form to the existing vital API shape. Blood pressure stays one string. */
export function toVitalsApiNumbers(form = {}) {
  const pain = form.pain_level === '' || form.pain_level == null
    ? 0
    : Number(form.pain_level);

  const parsedStored = splitBloodPressure(form.blood_pressure);
  const bloodPressure = composeBloodPressure(form.bp_systolic, form.bp_diastolic)
    ?? (parsedStored.unparsed
      ? null
      : composeBloodPressure(parsedStored.systolic, parsedStored.diastolic));

  return {
    temperature: optionalNumber(form.temperature),
    blood_pressure: bloodPressure,
    heart_rate: optionalNumber(form.heart_rate),
    respiratory_rate: optionalNumber(form.respiratory_rate),
    oxygen_saturation: optionalNumber(form.oxygen_saturation),
    blood_sugar: optionalNumber(form.blood_sugar),
    weight: optionalNumber(form.weight),
    pain_level: Number.isFinite(pain) ? pain : 0,
  };
}
