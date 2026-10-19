/**
 * Bed type comes from the bed API (`bed_type` on create, update, and list).
 * The old local overlay is not read: bed ids can collide across hospitals.
 */

import { coerceBedType } from '../../features/manager/utils/bedTariffRates.js';

export const BED_TYPE_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'double', label: 'Double' },
];

/** @deprecated Overlay removed. Always empty so callers cannot merge another hospital's types. */
export function readBedTypeOverlay() {
  return {};
}

/** @deprecated Overlay writes are obsolete. The bed API persists bed_type. */
export function writeBedTypeOverlay() {}

/** @deprecated No-op. Create and update requests already send bed_type. */
export function setBedTypesInOverlay() {}

/** Prefer the bed record's bed_type. Missing values display as single. */
export function resolveBedType(bed) {
  if (!bed) return 'single';
  if (bed.bed_type != null && String(bed.bed_type).trim()) {
    return coerceBedType(bed.bed_type);
  }
  return 'single';
}

export function mergeBedTypes(beds) {
  if (!Array.isArray(beds)) return [];
  return beds.map((bed) => ({
    ...bed,
    bed_type: resolveBedType(bed),
  }));
}

export function filterBedsByType(beds, bedType) {
  const type = coerceBedType(bedType);
  return (beds ?? []).filter((bed) => resolveBedType(bed) === type);
}
