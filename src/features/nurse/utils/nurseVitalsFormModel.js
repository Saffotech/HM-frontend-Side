import {
  Activity,
  Droplets,
  Heart,
  Scale,
  Stethoscope,
  Thermometer,
  Wind,
} from 'lucide-react';

const CUSTOM_VITALS_MARKER = '__custom_vitals__';

export const VITAL_FIELDS = [
  { key: 'temperature', label: 'Temperature (°F)', icon: Thermometer, accent: 'rose', inputMode: 'decimal', placeholder: 'e.g. 98.6' },
  { key: 'blood_pressure', label: 'Blood Pressure', icon: Activity, accent: 'blue', inputMode: 'numeric', placeholder: 'e.g. 120/80' },
  { key: 'heart_rate', label: 'Heart Rate (BPM)', icon: Heart, accent: 'red', inputMode: 'numeric', placeholder: 'e.g. 72' },
  { key: 'respiratory_rate', label: 'Respiratory Rate (/min)', icon: Wind, accent: 'teal', inputMode: 'numeric', placeholder: 'e.g. 16' },
  { key: 'oxygen_saturation', label: 'SpO₂ (%)', icon: Droplets, accent: 'sky', inputMode: 'numeric', min: 0, max: 100, placeholder: 'e.g. 98' },
  { key: 'blood_sugar', label: 'Blood Sugar (mg/dL)', icon: Droplets, accent: 'amber', inputMode: 'numeric', placeholder: 'e.g. 110' },
  { key: 'weight', label: 'Weight (kg)', icon: Scale, accent: 'slate', inputMode: 'decimal', placeholder: 'e.g. 70' },
  { key: 'pain_level', label: 'Pain Level', icon: Stethoscope, accent: 'purple', type: 'range', min: 0, max: 10 },
];

export const INITIAL_VITALS_FORM = {
  temperature: '',
  blood_pressure: '',
  heart_rate: '',
  respiratory_rate: '',
  oxygen_saturation: '',
  blood_sugar: '',
  weight: '',
  pain_level: 0,
  customVitals: [],
};

export function encodeCustomVitals(customVitals = []) {
  const cleaned = (customVitals ?? [])
    .map((row) => ({
      label: String(row.label ?? '').trim(),
      value: String(row.value ?? '').trim(),
      unit: String(row.unit ?? '').trim(),
    }))
    .filter((row) => row.label && row.value);
  if (!cleaned.length) return null;
  return JSON.stringify({ [CUSTOM_VITALS_MARKER]: cleaned });
}

export function decodeCustomVitals(observationNotes) {
  if (!observationNotes || typeof observationNotes !== 'string') return [];
  try {
    const parsed = JSON.parse(observationNotes);
    const rows = parsed?.[CUSTOM_VITALS_MARKER];
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((row) => row && (row.label || row.value))
      .map((row, index) => ({
        id: `cv-loaded-${index}`,
        label: String(row.label ?? ''),
        value: String(row.value ?? ''),
        unit: String(row.unit ?? ''),
      }));
  } catch {
    return [];
  }
}

export function buildVitalsPayload(form, { appointmentId, patientId } = {}) {
  const payload = {
    temperature: form.temperature ? Number(form.temperature) : null,
    blood_pressure: form.blood_pressure || null,
    heart_rate: form.heart_rate ? Number(form.heart_rate) : null,
    respiratory_rate: form.respiratory_rate ? Number(form.respiratory_rate) : null,
    oxygen_saturation: form.oxygen_saturation ? Number(form.oxygen_saturation) : null,
    blood_sugar: form.blood_sugar ? Number(form.blood_sugar) : null,
    weight: form.weight ? Number(form.weight) : null,
    pain_level: Number(form.pain_level),
    observation_notes: encodeCustomVitals(form.customVitals),
  };

  if (appointmentId) payload.appointment_id = Number(appointmentId);
  if (patientId) payload.patient_id = Number(patientId);

  return payload;
}

export function vitalsToForm(vital) {
  return {
    temperature: vital.temperature ?? '',
    blood_pressure: vital.blood_pressure ?? '',
    heart_rate: vital.heart_rate ?? '',
    respiratory_rate: vital.respiratory_rate ?? '',
    oxygen_saturation: vital.oxygen_saturation ?? '',
    blood_sugar: vital.blood_sugar ?? '',
    weight: vital.weight ?? '',
    pain_level: vital.pain_level ?? 0,
    customVitals: decodeCustomVitals(vital.observation_notes),
  };
}

export function formatVitalDisplay(key, value) {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'pain_level') return `${value}/10`;
  return String(value);
}
