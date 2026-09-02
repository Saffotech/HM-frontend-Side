/**
 * Frontend bed type overlay until backend persists `bed_type` on beds inventory.
 * Admin inventory create/update writes here; IPD/admit UIs merge on read.
 */

import { coerceBedType } from '@/features/admin/utils/bedTariffRates';

const STORAGE_KEY = 'hm_bed_type_overlay_v1';

export const BED_TYPE_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'double', label: 'Double' },
];

export function readBedTypeOverlay() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeBedTypeOverlay(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

/** Persist type for one or more beds (admin inventory UI). */
export function setBedTypesInOverlay(entries) {
  const list = Array.isArray(entries) ? entries : [entries];
  const map = readBedTypeOverlay();
  for (const row of list) {
    if (!row) continue;
    const id = row.id ?? row.bedId ?? row.bed_id;
    if (id == null) continue;
    map[String(id)] = coerceBedType(row.bed_type ?? row.type);
  }
  writeBedTypeOverlay(map);
}

/** API `bed_type` wins; overlay fills gaps; default single. */
export function resolveBedType(bed) {
  if (!bed) return 'single';
  if (bed.bed_type != null && String(bed.bed_type).trim()) {
    return coerceBedType(bed.bed_type);
  }
  const overlay = readBedTypeOverlay();
  return coerceBedType(overlay[String(bed.id)]);
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
