import { useEffect, useState } from 'react';
import {
  Activity,
  Eraser,
  Plus,
  Trash2,
} from 'lucide-react';
import { NurseClinicalFieldShell } from '@/features/nurse/components/NurseClinicalFieldCard';
import { VITAL_FIELDS } from '@/features/nurse/utils/nurseVitalsFormModel';
import {
  acceptVitalDraft,
  blockedVitalKey,
  composeBloodPressure,
  validateVitalsForm,
} from '@/features/nurse/utils/vitalSignsValidation';

/** Digits + one decimal point for custom vital values. */
function decimalDigitsOnly(value) {
  const cleaned = String(value ?? '').replace(/[^\d.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join('').replace(/\./g, '')}`;
}

function newCustomVitalRow() {
  return {
    id: `cv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: '',
    value: '',
    unit: '',
  };
}

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="nurse-vitals-field-error" role="alert">
      {message}
    </p>
  );
}

export default function NurseVitalsFormFields({ form, setForm, showAllErrors = false, resetKey = '' }) {
  const [touched, setTouched] = useState({});
  const [forced, setForced] = useState({});
  const { errors } = validateVitalsForm(form);

  useEffect(() => {
    setTouched({});
    setForced({});
  }, [resetKey]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const applyDraft = (key, raw) => {
    const result = acceptVitalDraft(key, raw, form[key]);
    if (result.reject) {
      setForced((prev) => ({ ...prev, [key]: result.error }));
      setTouched((prev) => ({ ...prev, [key]: true }));
      return;
    }
    setForced((prev) => ({ ...prev, [key]: '' }));
    if (result.showNow) setTouched((prev) => ({ ...prev, [key]: true }));
    set(key, result.value);
  };

  const markBlur = (key) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setForced((prev) => ({ ...prev, [key]: '' }));
  };

  const visibleError = (key) => {
    if (forced[key]) return forced[key];
    if (touched[key] || showAllErrors) return errors[key] || '';
    return '';
  };

  const setBp = (part, raw) => {
    const result = acceptVitalDraft(part, raw, form[part]);
    if (result.reject) {
      setForced((prev) => ({ ...prev, [part]: result.error }));
      setTouched((prev) => ({ ...prev, [part]: true }));
      return;
    }
    setForced((prev) => ({ ...prev, [part]: '' }));
    if (result.showNow) setTouched((prev) => ({ ...prev, [part]: true }));
    setForm((prev) => {
      const next = { ...prev, [part]: result.value };
      next.blood_pressure = composeBloodPressure(next.bp_systolic, next.bp_diastolic) ?? '';
      return next;
    });
  };

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
        {VITAL_FIELDS.map(({ key, label, icon: Icon, accent, placeholder, inputMode }) => (
          key === 'blood_pressure' ? (
            <NurseClinicalFieldShell
              key={key}
              accent={accent}
              icon={Icon}
              label={label}
              className="nurse-clinical-field--bp"
              onClear={() => {
                setForced((prev) => ({ ...prev, bp_systolic: '', bp_diastolic: '' }));
                setForm((prev) => ({
                  ...prev,
                  bp_systolic: '',
                  bp_diastolic: '',
                  blood_pressure: '',
                }));
              }}
              clearDisabled={!form.bp_systolic && !form.bp_diastolic}
              clearContent={
                <>
                  <Eraser size={14} />
                  Clear
                </>
              }
            >
              <div className="nurse-vitals-bp">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className={`nurse-input nurse-clinical-field__input${visibleError('bp_systolic') ? ' nurse-clinical-field__input--invalid' : ''}`}
                  placeholder="Systolic"
                  aria-label="Systolic blood pressure"
                  aria-invalid={visibleError('bp_systolic') ? 'true' : undefined}
                  aria-describedby={visibleError('bp_systolic') ? 'vital-bp-error' : undefined}
                  value={form.bp_systolic ?? ''}
                  onChange={(e) => setBp('bp_systolic', e.target.value)}
                  onBlur={() => markBlur('bp_systolic')}
                  onKeyDown={(e) => {
                    if (e.ctrlKey || e.metaKey || e.altKey) return;
                    const message = blockedVitalKey(
                      'bp_systolic',
                      e.currentTarget.value,
                      e.key,
                      e.currentTarget.selectionStart,
                      e.currentTarget.selectionEnd,
                    );
                    if (!message) return;
                    e.preventDefault();
                    setForced((prev) => ({ ...prev, bp_systolic: message }));
                    setTouched((prev) => ({ ...prev, bp_systolic: true }));
                  }}
                />
                <span className="nurse-vitals-bp__sep" aria-hidden>/</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className={`nurse-input nurse-clinical-field__input${visibleError('bp_diastolic') ? ' nurse-clinical-field__input--invalid' : ''}`}
                  placeholder="Diastolic"
                  aria-label="Diastolic blood pressure"
                  aria-invalid={visibleError('bp_diastolic') ? 'true' : undefined}
                  aria-describedby={visibleError('bp_diastolic') ? 'vital-bp-error' : undefined}
                  value={form.bp_diastolic ?? ''}
                  onChange={(e) => setBp('bp_diastolic', e.target.value)}
                  onBlur={() => markBlur('bp_diastolic')}
                  onKeyDown={(e) => {
                    if (e.ctrlKey || e.metaKey || e.altKey) return;
                    const message = blockedVitalKey(
                      'bp_diastolic',
                      e.currentTarget.value,
                      e.key,
                      e.currentTarget.selectionStart,
                      e.currentTarget.selectionEnd,
                    );
                    if (!message) return;
                    e.preventDefault();
                    setForced((prev) => ({ ...prev, bp_diastolic: message }));
                    setTouched((prev) => ({ ...prev, bp_diastolic: true }));
                  }}
                />
                <span className="nurse-vitals-bp__unit">mmHg</span>
              </div>
              {form.bp_systolic && form.bp_diastolic && !visibleError('bp_systolic') && !visibleError('bp_diastolic') ? (
                <p className="nurse-vitals-bp__readout">
                  {`${Number(form.bp_systolic)}/${Number(form.bp_diastolic)} mmHg`}
                </p>
              ) : null}
              <FieldError
                id="vital-bp-error"
                message={visibleError('bp_systolic') || visibleError('bp_diastolic')}
              />
            </NurseClinicalFieldShell>
          ) : (
            <NurseClinicalFieldShell
              key={key}
              accent={accent}
              icon={Icon}
              label={key === 'pain_level' && form.pain_level !== '' && form.pain_level != null
                ? `${label.replace(' (0–10)', '')} (${form.pain_level}/10)`
                : label}
              onClear={() => {
                setForced((prev) => ({ ...prev, [key]: '' }));
                set(key, '');
              }}
              clearDisabled={form[key] === '' || form[key] == null}
              clearContent={
                <>
                  <Eraser size={14} />
                  Clear
                </>
              }
            >
              <input
                type="text"
                inputMode={inputMode || 'numeric'}
                autoComplete="off"
                className={`nurse-input nurse-clinical-field__input${visibleError(key) ? ' nurse-clinical-field__input--invalid' : ''}`}
                placeholder={placeholder}
                aria-label={label}
                aria-invalid={visibleError(key) ? 'true' : undefined}
                aria-describedby={visibleError(key) ? `vital-${key}-error` : undefined}
                value={form[key] ?? ''}
                onChange={(e) => applyDraft(key, e.target.value)}
                onBlur={() => markBlur(key)}
                onKeyDown={(e) => {
                  if (e.ctrlKey || e.metaKey || e.altKey) return;
                  const message = blockedVitalKey(
                    key,
                    e.currentTarget.value,
                    e.key,
                    e.currentTarget.selectionStart,
                    e.currentTarget.selectionEnd,
                  );
                  if (!message) return;
                  e.preventDefault();
                  setForced((prev) => ({ ...prev, [key]: message }));
                  setTouched((prev) => ({ ...prev, [key]: true }));
                }}
              />
              <FieldError id={`vital-${key}-error`} message={visibleError(key)} />
            </NurseClinicalFieldShell>
          )
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
