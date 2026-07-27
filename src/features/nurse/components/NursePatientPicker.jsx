import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { User, X } from 'lucide-react';
import { formatPatientPickerLabel } from '@/shared/api/mappers/nurseMapper';
import { useNursePatientDirectory } from '@/features/nurse/hooks/useNursePatientDirectory';
import { useNurseBedAllocationSummaryQuery } from '@/shared/hooks/queries/useNurseQuery';
import './NursePatientPicker.css';

const MAX_OPTIONS = 25;

function matchesPatientQuery(patient, term) {
  if (!term) return true;
  const needle = term.trim().toLowerCase();
  const label = formatPatientPickerLabel(patient).toLowerCase();
  return label.includes(needle);
}

function formatShiftBadge(shiftName) {
  if (!shiftName) return 'Current Shift';
  const name = String(shiftName).trim();
  if (!name) return 'Current Shift';
  return name.toLowerCase().includes('shift') ? name : `${name} Shift`;
}

/**
 * @param {object} props
 * @param {boolean} [props.allocationAware=false] Phase 5 — handover only.
 *   When true and the nurse has allocations, show Allocated / All Patients source toggle.
 *   Alerts and other callers leave this false (unchanged hospital-wide directory).
 */
export default function NursePatientPicker({
  id: idProp,
  value = null,
  onChange,
  excludePatientIds = [],
  required = false,
  disabled = false,
  placeholder = 'Search by patient ID or name…',
  hint = 'Patients with an assigned bed or active medications',
  allocationAware = false,
}) {
  const autoId = useId();
  const inputId = idProp ?? `nurse-patient-picker-${autoId}`;
  const listId = `${inputId}-list`;
  const rootRef = useRef(null);
  const defaultSourceApplied = useRef(false);

  const {
    data: allocationSummary,
    isLoading: summaryLoading,
  } = useNurseBedAllocationSummaryQuery({}, { enabled: allocationAware && !disabled });

  /** null until default resolved when allocationAware; otherwise always 'all'. */
  const [listSource, setListSource] = useState(allocationAware ? null : 'all');

  useEffect(() => {
    if (!allocationAware) {
      setListSource('all');
      return;
    }
    if (defaultSourceApplied.current) return;
    if (summaryLoading) return;
    setListSource(allocationSummary?.has_allocations ? 'allocated' : 'all');
    defaultSourceApplied.current = true;
  }, [allocationAware, allocationSummary, summaryLoading]);

  const hasAllocations = Boolean(allocationSummary?.has_allocations);
  const showSourceToggle = allocationAware && hasAllocations;
  const allocatedOnly = allocationAware && listSource === 'allocated';

  const { patients, isLoading } = useNursePatientDirectory({
    enabled: !disabled && listSource != null,
    allocatedOnly,
  });

  const allocatedBedIdSet = useMemo(
    () => new Set((allocationSummary?.allocated_bed_ids ?? []).map(Number)),
    [allocationSummary?.allocated_bed_ids],
  );

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

  const isAllocatedPatient = (patient) => {
    if (allocatedOnly) return true;
    const bedId = Number(patient?.bed_id);
    return Number.isFinite(bedId) && allocatedBedIdSet.has(bedId);
  };

  const resolvedHint = (() => {
    if (!allocationAware) return hint;
    if (listSource === 'allocated') {
      return 'Showing occupied beds assigned to you for this shift';
    }
    if (hasAllocations) {
      return 'Showing all occupied beds and medication patients (hospital-wide)';
    }
    return hint;
  })();

  const sourceControls = showSourceToggle ? (
    <div className="nurse-patient-picker__source">
      <div
        className="nurse-patient-picker__source-toggle"
        role="tablist"
        aria-label="Patient source"
      >
        <button
          type="button"
          role="tab"
          aria-selected={listSource === 'allocated'}
          className={`nurse-patient-picker__source-btn ${listSource === 'allocated' ? 'is-active' : ''}`}
          onClick={() => setListSource('allocated')}
          disabled={disabled}
        >
          Allocated
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={listSource === 'all'}
          className={`nurse-patient-picker__source-btn ${listSource === 'all' ? 'is-active' : ''}`}
          onClick={() => setListSource('all')}
          disabled={disabled}
        >
          All Patients
        </button>
      </div>
      {allocationSummary?.shift_name && (
        <span className="nurse-badge nurse-badge--current-shift">
          {formatShiftBadge(allocationSummary.shift_name)}
        </span>
      )}
    </div>
  ) : null;

  if (selected && !open) {
    return (
      <div className="nurse-patient-picker" ref={rootRef}>
        {sourceControls}
        <label className="nurse-patient-picker__label" htmlFor={inputId}>
          Patient
        </label>
        <div className="nurse-patient-picker__selected">
          <User size={16} className="nurse-patient-picker__icon" aria-hidden />
          <span className="nurse-patient-picker__selected-text">
            {formatPatientPickerLabel(selected)}
          </span>
          {allocationAware && isAllocatedPatient(selected) && (
            <span className="nurse-badge nurse-badge--allocated">Allocated</span>
          )}
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
        {resolvedHint && <p className="nurse-patient-picker__hint">{resolvedHint}</p>}
      </div>
    );
  }

  return (
    <div className="nurse-patient-picker" ref={rootRef}>
      {sourceControls}
      <label className="nurse-patient-picker__label" htmlFor={inputId}>
        Patient{required ? ' *' : ''}
      </label>
      <div className="nurse-patient-picker__input-wrap">
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
          disabled={disabled || (allocationAware && listSource == null)}
          required={required && value == null}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
        />
      </div>
      {resolvedHint && <p className="nurse-patient-picker__hint">{resolvedHint}</p>}
      {open && !disabled && (
        <ul id={listId} className="nurse-patient-picker__list" role="listbox">
          {(isLoading || (allocationAware && listSource == null)) && (
            <li className="nurse-patient-picker__empty">Loading patients…</li>
          )}
          {!isLoading && listSource != null && options.length === 0 && (
            <li className="nurse-patient-picker__empty">
              {allocatedOnly
                ? 'No allocated occupied patients match. Switch to All Patients or try another search.'
                : 'No matching patients. Try another name or patient ID.'}
            </li>
          )}
          {!isLoading && listSource != null && options.map((patient) => (
            <li key={patient.patient_id}>
              <button
                type="button"
                className="nurse-patient-picker__option"
                role="option"
                aria-selected={String(value) === String(patient.patient_id)}
                onClick={() => pickPatient(patient)}
              >
                <span className="nurse-patient-picker__option-main">
                  {formatPatientPickerLabel(patient)}
                </span>
                {allocationAware && isAllocatedPatient(patient) && (
                  <span className="nurse-badge nurse-badge--allocated">Allocated</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
