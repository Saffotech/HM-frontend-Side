/**
 * Read-only bed tariff rows for IPD/OPD pricing views.
 * Merges single ward_rates, double (__double__:ward) entries, and legacy single
 * charges on matching wards (general/private/icu fields). Does not invent ward rows.
 */

import {
  DOUBLE_WARD_PREFIX,
  doubleWardStorageKey,
  isDoubleWardStorageKey,
} from '@/features/admin/utils/bedTariffRates';

function finiteCharge(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function wardKey(name) {
  return String(name || '').trim().toLowerCase();
}

function findWardKey(map, wardLabel) {
  const key = wardKey(wardLabel);
  if (!key) return key;
  if (map.has(key)) return key;
  for (const existing of map.keys()) {
    if (existing.includes(key) || key.includes(existing)) return existing;
  }
  return key;
}

function ensureWard(map, wardLabel) {
  const label = String(wardLabel || '').trim();
  if (!label) return null;
  const key = findWardKey(map, label);
  if (!map.has(key)) {
    map.set(key, { ward: label, single: null, double: null });
  } else if (label.length > map.get(key).ward.length) {
    map.get(key).ward = label;
  }
  return map.get(key);
}

function resolveWardSingleCharge(bedTariff, wardName) {
  const key = wardKey(wardName);
  if (key === 'general') return finiteCharge(bedTariff?.general_ward_charge);
  if (key === 'private') return finiteCharge(bedTariff?.private_ward_charge);
  if (key === 'icu') return finiteCharge(bedTariff?.icu_charge);
  const match = (bedTariff?.ward_rates ?? []).find(
    (row) =>
      !isDoubleWardStorageKey(row.ward_name) &&
      wardKey(row.ward_name) === key,
  );
  if (match) return finiteCharge(match.charge_per_day);
  return finiteCharge(bedTariff?.general_ward_charge);
}

function resolveWardDoubleCharge(bedTariff, wardName) {
  const dblKey = wardKey(doubleWardStorageKey(wardName));
  const match = (bedTariff?.ward_rates ?? []).find(
    (row) => wardKey(row.ward_name) === dblKey,
  );
  if (match) return finiteCharge(match.charge_per_day);
  return null;
}

/**
 * One row per ward: single and double daily charges side by side.
 */
export function buildWardTariffDisplayRows(bedTariff, options = {}) {
  if (!bedTariff) return [];
  const map = new Map();

  for (const row of bedTariff.ward_rates ?? []) {
    const raw = String(row.ward_name || '').trim();
    if (!raw) continue;
    const charge = finiteCharge(row.charge_per_day);
    if (isDoubleWardStorageKey(raw)) {
      const ward = raw.replace(new RegExp(`^${DOUBLE_WARD_PREFIX}`, 'i'), '').trim();
      const entry = ensureWard(map, ward);
      if (entry && charge != null) entry.double = charge;
    } else {
      const entry = ensureWard(map, raw);
      if (entry && charge != null) entry.single = charge;
    }
  }

  const fillBuiltinSingleOnMatch = (charge, keywords) => {
    const n = finiteCharge(charge);
    if (n == null) return;
    for (const key of map.keys()) {
      if (keywords.some((word) => key.includes(word))) {
        const entry = map.get(key);
        if (entry && entry.single == null) entry.single = n;
      }
    }
  };

  // Legacy fields: fill single rate on matching ward rows only — never add ICU/Private rows
  // when those wards are not in ward_rates / bed inventory.
  fillBuiltinSingleOnMatch(bedTariff.general_ward_charge, ['general']);
  fillBuiltinSingleOnMatch(bedTariff.private_ward_charge, ['private']);
  fillBuiltinSingleOnMatch(bedTariff.icu_charge, ['icu']);

  const inventoryWardNames = (options.inventoryWardNames ?? [])
    .map((name) => String(name || '').trim())
    .filter(Boolean);

  if (inventoryWardNames.length > 0) {
    for (const wardName of inventoryWardNames) {
      ensureWard(map, wardName);
    }
    const rows = inventoryWardNames.map((wardName) => {
      const entry = ensureWard(map, wardName);
      if (!entry) return null;
      if (entry.single == null) {
        entry.single = resolveWardSingleCharge(bedTariff, wardName);
      }
      if (entry.double == null) {
        entry.double = resolveWardDoubleCharge(bedTariff, wardName);
      }
      return entry;
    });
    return rows
      .filter(Boolean)
      .filter((row) => row.single != null || row.double != null)
      .sort((a, b) => a.ward.localeCompare(b.ward));
  }

  return [...map.values()]
    .filter((row) => row.single != null || row.double != null)
    .sort((a, b) => a.ward.localeCompare(b.ward));
}

export function buildSpecialBedDisplayRows(bedTariff) {
  if (!bedTariff) return [];
  return (bedTariff.special_bed_rates ?? [])
    .map((row, idx) => {
      const bed = String(row.bed_number || '').trim();
      if (!bed) return null;
      const charge = finiteCharge(row.charge_per_day);
      if (charge == null) return null;
      const ward = String(row.ward_name || '').trim() || '—';
      return {
        key: `${bed}-${idx}`,
        bed,
        ward,
        wardKey: ward === '—' ? '' : wardKey(ward),
        charge,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.bed.localeCompare(b.bed, undefined, { numeric: true }));
}

function wardsMatch(wardLabel, specialWardLabel) {
  const a = wardKey(wardLabel);
  const b = wardKey(specialWardLabel);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * Ward default rates for a custom bed, if the ward exists in the tariff table.
 */
export function findWardDefaultForSpecial(wardRows, special) {
  if (!special) return null;
  return wardRows.find((row) => wardsMatch(row.ward, special.ward)) ?? null;
}

export function specialBedMatchesWardFilter(special, wardFilter) {
  if (!wardFilter || wardFilter === 'all') return true;
  return wardsMatch(special?.ward, wardFilter);
}

/**
 * Inventory wards first (Super Admin Beds & wards order), then any extra names.
 */
export function buildWardFilterOptions({ inventoryWardNames, wardRows, specialRows }) {
  const seen = new Set();
  const names = [];
  const add = (raw) => {
    const name = String(raw || '').trim();
    if (!name || name === '—') return;
    const key = wardKey(name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    names.push(name);
  };
  for (const name of inventoryWardNames ?? []) add(name);
  for (const row of wardRows ?? []) add(row.ward);
  for (const row of specialRows ?? []) add(row.ward);
  return names;
}

export function hasBedTariffData(bedTariff) {
  return (
    buildWardTariffDisplayRows(bedTariff).length > 0 ||
    buildSpecialBedDisplayRows(bedTariff).length > 0
  );
}
