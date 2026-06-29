export const INITIAL_VITALS_FORM = {
  temperature: '',
  blood_pressure: '',
  heart_rate: '',
  respiratory_rate: '',
  oxygen_saturation: '',
  blood_sugar: '',
  weight: '',
  pain_level: 0,
  observation_notes: '',
};

export function buildVitalsPayload(form, { appointmentId } = {}) {
  const payload = {
    temperature: form.temperature ? Number(form.temperature) : null,
    blood_pressure: form.blood_pressure || null,
    heart_rate: form.heart_rate ? Number(form.heart_rate) : null,
    respiratory_rate: form.respiratory_rate ? Number(form.respiratory_rate) : null,
    oxygen_saturation: form.oxygen_saturation ? Number(form.oxygen_saturation) : null,
    blood_sugar: form.blood_sugar ? Number(form.blood_sugar) : null,
    weight: form.weight ? Number(form.weight) : null,
    pain_level: Number(form.pain_level),
    observation_notes: form.observation_notes || null,
  };

  if (appointmentId) {
    payload.appointment_id = appointmentId;
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
    observation_notes: vital.observation_notes ?? '',
  };
}

export default function NurseVitalsFormFields({ form, setForm }) {
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

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

      <div className="nurse-field">
        <label>Observation Notes</label>
        <textarea
          rows={3}
          className="nurse-textarea"
          value={form.observation_notes}
          onChange={(e) => set('observation_notes', e.target.value)}
          placeholder="Record any extra measurements or clinical observations here…"
        />
      </div>
    </>
  );
}
