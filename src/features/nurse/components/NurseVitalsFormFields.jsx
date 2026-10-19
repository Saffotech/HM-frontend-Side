import {
  Activity,
  Eraser,
  Plus,
  Trash2,
} from 'lucide-react';
import { NurseClinicalFieldShell } from '@/features/nurse/components/NurseClinicalFieldCard';
import { VITAL_FIELDS } from '@/features/nurse/utils/nurseVitalsFormModel';

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

function newCustomVitalRow() {
  return {
    id: `cv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: '',
    value: '',
    unit: '',
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
