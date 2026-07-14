import { Plus, Trash2 } from 'lucide-react';

const CUSTOM_VITALS_MARKER = '__custom_vitals__';

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

/** Encode extra vitals into observation_notes for existing API/DB text column. */
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

/** Parse observation_notes back into custom vital rows (or empty if plain notes). */
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

  if (appointmentId) {
    payload.appointment_id = Number(appointmentId);
  }
  if (patientId) {
    payload.patient_id = Number(patientId);
  }

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
      <div className="nurse-form-grid">
        <div className="nurse-field">
          <label>Temperature (°F)</label>
          <input type="number" step="0.1" className="nurse-input" value={form.temperature} onChange={(e) => set('temperature', e.target.value)} />
        </div>
        <div className="nurse-field">
          <label>Blood Pressure</label>
          <input type="text" className="nurse-input" placeholder="120/80" value={form.blood_pressure} onChange={(e) => set('blood_pressure', e.target.value)} />
        </div>
        <div className="nurse-field">
          <label>Heart Rate (BPM)</label>
          <input type="number" className="nurse-input" value={form.heart_rate} onChange={(e) => set('heart_rate', e.target.value)} />
        </div>
        <div className="nurse-field">
          <label>Respiratory Rate</label>
          <input type="number" className="nurse-input" value={form.respiratory_rate} onChange={(e) => set('respiratory_rate', e.target.value)} />
        </div>
        <div className="nurse-field">
          <label>SpO₂ (%)</label>
          <input type="number" min="0" max="100" className="nurse-input" value={form.oxygen_saturation} onChange={(e) => set('oxygen_saturation', e.target.value)} />
        </div>
        <div className="nurse-field">
          <label>Blood Sugar (mg/dL)</label>
          <input type="number" className="nurse-input" value={form.blood_sugar} onChange={(e) => set('blood_sugar', e.target.value)} />
        </div>
        <div className="nurse-field">
          <label>Weight (kg)</label>
          <input type="number" step="0.1" className="nurse-input" value={form.weight} onChange={(e) => set('weight', e.target.value)} />
        </div>
        <div className="nurse-field">
          <label>Pain Level ({form.pain_level}/10)</label>
          <input type="range" min="0" max="10" className="nurse-input" value={form.pain_level} onChange={(e) => set('pain_level', e.target.value)} />
        </div>
      </div>

      <div className="nurse-custom-vitals">
        <div className="nurse-custom-vitals__head">
          <div>
            <h3 className="nurse-custom-vitals__title">Other vitals</h3>
            <p className="nurse-custom-vitals__hint">Add tests that are not in the list above (e.g. BMI, Height, GCS).</p>
          </div>
          <button type="button" className="nurse-btn nurse-btn--secondary nurse-custom-vitals__add" onClick={addCustomVital}>
            <Plus size={16} aria-hidden />
            Add vital
          </button>
        </div>

        {customVitals.length > 0 && (
          <div className="nurse-custom-vitals__list">
            {customVitals.map((row) => (
              <div key={row.id} className="nurse-custom-vitals__row">
                <div className="nurse-field">
                  <label>Test name</label>
                  <input
                    type="text"
                    className="nurse-input"
                    placeholder="e.g. BMI"
                    value={row.label}
                    onChange={(e) => updateCustomVital(row.id, 'label', e.target.value)}
                  />
                </div>
                <div className="nurse-field">
                  <label>Value</label>
                  <input
                    type="text"
                    className="nurse-input"
                    placeholder="e.g. 22.5"
                    value={row.value}
                    onChange={(e) => updateCustomVital(row.id, 'value', e.target.value)}
                  />
                </div>
                <div className="nurse-field">
                  <label>Unit</label>
                  <input
                    type="text"
                    className="nurse-input"
                    placeholder="optional"
                    value={row.unit}
                    onChange={(e) => updateCustomVital(row.id, 'unit', e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="nurse-btn nurse-btn--ghost nurse-custom-vitals__remove"
                  onClick={() => removeCustomVital(row.id)}
                  aria-label={`Remove ${row.label || 'custom vital'}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
