import {
  Activity,
  Droplets,
  Eraser,
  Heart,
  Plus,
  Scale,
  Stethoscope,
  Thermometer,
  Trash2,
  Wind,
} from 'lucide-react';
import { NurseClinicalFieldShell } from '@/features/nurse/components/NurseClinicalFieldCard';

const CUSTOM_VITALS_MARKER = '__custom_vitals__';

/** Digits only (no letters). */
function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '');
}

/** Digits + one decimal point (for temperature / weight). */
function decimalDigitsOnly(value) {
  const cleaned = String(value ?? '').replace(/[^\d.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join('').replace(/\./g, '')}`;
}

/** Blood pressure: digits and `/` only (e.g. 120/80). */
function bloodPressureDigitsOnly(value) {
  const cleaned = String(value ?? '').replace(/[^\d/]/g, '');
  const parts = cleaned.split('/');
  if (parts.length === 1) return parts[0];
  return `${parts[0]}/${parts.slice(1).join('').replace(/\//g, '')}`;
}

function sanitizeVitalInput(key, value) {
  if (key === 'blood_pressure') return bloodPressureDigitsOnly(value);
  if (key === 'temperature' || key === 'weight') return decimalDigitsOnly(value);
  return digitsOnly(value);
}

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

function newCustomVitalRow() {
  return {
    id: `cv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: '',
    value: '',
    unit: '',
  };
}

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

function formatVitalDisplay(key, value) {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'pain_level') return `${value}/10`;
  return String(value);
}

export { formatVitalDisplay };

export default function NurseVitalsFormFields({ form, setForm }) {
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const customVitals = form.customVitals ?? [];

  const addCustomVital = () => {
    setForm((prev) => ({
      ...prev,
      customVitals: [...(prev.customVitals ?? []), newCustomVitalRow()],
    }));
  };

  const updateCustomVital = (id, key, value) => {
    setForm((prev) => ({
      ...prev,
      customVitals: (prev.customVitals ?? []).map((row) =>
        row.id === id ? { ...row, [key]: value } : row,
      ),
    }));
  };

  const removeCustomVital = (id) => {
    setForm((prev) => ({
      ...prev,
      customVitals: (prev.customVitals ?? []).filter((row) => row.id !== id),
    }));
  };

  return (
    <>
      <div className="nurse-clinical-fields nurse-clinical-fields--grid nurse-clinical-fields--vitals">
        {VITAL_FIELDS.map(({ key, label, icon: Icon, accent, type, placeholder, inputMode, min, max }) => (
          <NurseClinicalFieldShell
            key={key}
            accent={accent}
            icon={Icon}
            label={type === 'range' ? `${label} (${form.pain_level}/10)` : label}
            onClear={() => set(key, type === 'range' ? 0 : '')}
            clearDisabled={type === 'range' ? Number(form[key]) === 0 : !form[key]}
            clearContent={
              <>
                <Eraser size={14} />
                Clear
              </>
            }
          >
            {type === 'range' ? (
              <input
                type="range"
                min={min}
                max={max}
                className="nurse-clinical-field__range"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
              />
            ) : (
              <input
                type="text"
                inputMode={inputMode || 'numeric'}
                autoComplete="off"
                min={min}
                max={max}
                className="nurse-input nurse-clinical-field__input"
                placeholder={placeholder}
                value={form[key]}
                onChange={(e) => set(key, sanitizeVitalInput(key, e.target.value))}
                onKeyDown={(e) => {
                  if (e.ctrlKey || e.metaKey || e.altKey) return;
                  const allowedKeys = [
                    'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End',
                  ];
                  if (allowedKeys.includes(e.key)) return;
                  if (key === 'blood_pressure' && e.key === '/') return;
                  if ((key === 'temperature' || key === 'weight') && e.key === '.') return;
                  if (/^\d$/.test(e.key)) return;
                  e.preventDefault();
                }}
              />
            )}
          </NurseClinicalFieldShell>
        ))}
      </div>

      <div className="nurse-custom-vitals">
        <div className="nurse-custom-vitals__head">
          <div>
            <h3 className="nurse-custom-vitals__title">Other Vitals</h3>
            <p className="nurse-custom-vitals__hint">
              Add tests that are not in the list above (e.g. BMI, Height, GCS).
            </p>
          </div>
          <button type="button" className="nurse-btn nurse-btn--secondary nurse-custom-vitals__add" onClick={addCustomVital}>
            <Plus size={16} aria-hidden />
            Add Vital
          </button>
        </div>

        {customVitals.length > 0 ? (
          <div className="nurse-clinical-fields nurse-clinical-fields--grid nurse-clinical-fields--vitals">
            {customVitals.map((row) => (
              <NurseClinicalFieldShell
                key={row.id}
                accent="slate"
                icon={Activity}
                label={row.label || 'Custom Vital'}
                onClear={() => removeCustomVital(row.id)}
                clearDisabled={false}
                clearContent={
                  <>
                    <Trash2 size={14} />
                    Remove
                  </>
                }
              >
                <div className="nurse-clinical-field__inline">
                  <input
                    type="text"
                    className="nurse-input nurse-clinical-field__input"
                    placeholder="Test name (e.g. BMI)"
                    value={row.label}
                    onChange={(e) => updateCustomVital(row.id, 'label', e.target.value)}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    className="nurse-input nurse-clinical-field__input"
                    placeholder="Value"
                    value={row.value}
                    onChange={(e) =>
                      updateCustomVital(row.id, 'value', decimalDigitsOnly(e.target.value))
                    }
                  />
                  <input
                    type="text"
                    className="nurse-input nurse-clinical-field__input"
                    placeholder="Unit (optional)"
                    value={row.unit}
                    onChange={(e) => updateCustomVital(row.id, 'unit', e.target.value)}
                  />
                </div>
              </NurseClinicalFieldShell>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}
