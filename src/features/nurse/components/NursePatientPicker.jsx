import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, User, X } from 'lucide-react';
import { formatPatientPickerLabel } from '@/shared/api/mappers/nurseMapper';
import { useNursePatientDirectory } from '@/features/nurse/hooks/useNursePatientDirectory';
import './NursePatientPicker.css';

const MAX_OPTIONS = 25;

function matchesPatientQuery(patient, term) {
  if (!term) return true;
  const needle = term.trim().toLowerCase();
  const label = formatPatientPickerLabel(patient).toLowerCase();
  return label.includes(needle);
}

export default function NursePatientPicker({
  id: idProp,
  value = null,
  onChange,
  excludePatientIds = [],
  required = false,
  disabled = false,
  placeholder = 'Search by patient ID or name…',
  hint = 'Patients with an assigned bed or active medications',
}) {
  const autoId = useId();
  const inputId = idProp ?? `nurse-patient-picker-${autoId}`;
  const listId = `${inputId}-list`;
  const rootRef = useRef(null);
  const { patients, isLoading } = useNursePatientDirectory({ enabled: !disabled });
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const excluded = useMemo(
    () => new Set((excludePatientIds ?? []).map((id) => Number(id))),
    [excludePatientIds],
  );

  const available = useMemo(
    () => patients.filter((p) => !excluded.has(Number(p.patient_id))),
    [patients, excluded],
  );

  const selected = useMemo(
    () => patients.find((p) => String(p.patient_id) === String(value)) ?? null,
    [patients, value],
  );

  const options = useMemo(() => {
    const filtered = available.filter((p) => matchesPatientQuery(p, query));
    return filtered.slice(0, MAX_OPTIONS);
  }, [available, query]);

  useEffect(() => {
    const onDocClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pickPatient = (patient) => {
    onChange?.(Number(patient.patient_id));
    setQuery('');
    setOpen(false);
  };

  const clearSelection = () => {
    onChange?.(null);
    setQuery('');
    setOpen(false);
  };

  if (selected && !open) {
    return (
      <div className="nurse-patient-picker" ref={rootRef}>
        <label className="nurse-patient-picker__label" htmlFor={inputId}>
          Patient
        </label>
        <div className="nurse-patient-picker__selected">
          <User size={16} className="nurse-patient-picker__icon" aria-hidden />
          <span className="nurse-patient-picker__selected-text">
            {formatPatientPickerLabel(selected)}
          </span>
          {!disabled && (
            <button
              type="button"
              className="nurse-patient-picker__clear"
              onClick={clearSelection}
              aria-label="Clear patient selection"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {hint && <p className="nurse-patient-picker__hint">{hint}</p>}
      </div>
    );
  }

  return (
    <div className="nurse-patient-picker" ref={rootRef}>
      <label className="nurse-patient-picker__label" htmlFor={inputId}>
        Patient{required ? ' *' : ''}
      </label>
      <div className="nurse-patient-picker__input-wrap">
        <Search size={16} className="nurse-patient-picker__icon" aria-hidden />
        <input
          id={inputId}
          type="search"
          className="nurse-input nurse-patient-picker__input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          required={required && value == null}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
        />
      </div>
      {hint && <p className="nurse-patient-picker__hint">{hint}</p>}
      {open && !disabled && (
        <ul id={listId} className="nurse-patient-picker__list" role="listbox">
          {isLoading && (
            <li className="nurse-patient-picker__empty">Loading patients…</li>
          )}
          {!isLoading && options.length === 0 && (
            <li className="nurse-patient-picker__empty">
              No matching patients. Try another name or patient ID.
            </li>
          )}
          {!isLoading && options.map((patient) => (
            <li key={patient.patient_id}>
              <button
                type="button"
                className="nurse-patient-picker__option"
                role="option"
                aria-selected={String(value) === String(patient.patient_id)}
                onClick={() => pickPatient(patient)}
              >
                {formatPatientPickerLabel(patient)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
