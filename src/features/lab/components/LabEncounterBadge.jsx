import { encounterBadgeClass, normalizeEncounterType } from '@/features/lab/utils/visitLocation';

/** Badge for encounter_type — OPD or IPD (never registration_source). */
export default function LabEncounterBadge({ encounterType }) {
  const visit = normalizeEncounterType(encounterType);
  return <span className={encounterBadgeClass(visit)}>{visit}</span>;
}
