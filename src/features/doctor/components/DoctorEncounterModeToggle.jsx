import { DOCTOR_ENCOUNTER_MODE } from '@/features/doctor/utils/encounterType';

export default function DoctorEncounterModeToggle({
  value = DOCTOR_ENCOUNTER_MODE.OPD,
  onChange,
  className = '',
  'aria-label': ariaLabel = 'Encounter type',
}) {
  if (typeof onChange !== 'function') return null;

  return (
    <div
      className={`doc-encounter-mode${className ? ` ${className}` : ''}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === DOCTOR_ENCOUNTER_MODE.OPD}
        className={`doc-encounter-mode__btn${
          value === DOCTOR_ENCOUNTER_MODE.OPD ? ' is-active' : ''
        }`}
        onClick={() => onChange(DOCTOR_ENCOUNTER_MODE.OPD)}
      >
        OPD
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === DOCTOR_ENCOUNTER_MODE.IPD}
        className={`doc-encounter-mode__btn${
          value === DOCTOR_ENCOUNTER_MODE.IPD ? ' is-active' : ''
        }`}
        onClick={() => onChange(DOCTOR_ENCOUNTER_MODE.IPD)}
      >
        IPD
      </button>
    </div>
  );
}
