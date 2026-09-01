/**
 * Resolve bed rate per day the same way as backend `opd_settings_service.resolve_bed_rate`,
 * plus frontend-only double-bed ward rates stored as `__double__:{ward}` in ward_rates.
 */

import {
  coerceBedType,
  doubleWardStorageKey,
  isDoubleWardStorageKey,
} from '@/features/admin/utils/bedTariffRates';

function findWardRate(bedTariff, wardName) {
  const wardKey = String(wardName || '').trim().toLowerCase();
  if (!wardKey) return null;
  for (const row of bedTariff.ward_rates || []) {
    if (isDoubleWardStorageKey(row.ward_name)) continue;
    if (String(row.ward_name || '').trim().toLowerCase() === wardKey) {
      const n = Number(row.charge_per_day);
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

function findDoubleWardRate(bedTariff, wardName) {
  const key = doubleWardStorageKey(wardName).toLowerCase();
  for (const row of bedTariff.ward_rates || []) {
    if (String(row.ward_name || '').trim().toLowerCase() === key) {
      const n = Number(row.charge_per_day);
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

function builtinSingleRate(bedTariff, wardKey) {
  if (wardKey.includes('icu')) {
    const n = Number(bedTariff.icu_charge);
    return Number.isFinite(n) ? n : null;
  }
  if (wardKey.includes('private')) {
    const n = Number(bedTariff.private_ward_charge);
    return Number.isFinite(n) ? n : null;
  }
  const general = Number(bedTariff.general_ward_charge);
  return Number.isFinite(general) ? general : null;
}

export function resolveBedRate(bedTariff, { bedNumber, wardName, bedType } = {}) {
  if (!bedTariff) return null;

  const bedKey = String(bedNumber || '').trim().toLowerCase();
  const wardKey = String(wardName || '').trim().toLowerCase();
  const type = coerceBedType(bedType);

  if (bedKey) {
    for (const row of bedTariff.special_bed_rates || []) {
      if (String(row.bed_number || '').trim().toLowerCase() === bedKey) {
        const n = Number(row.charge_per_day);
        return Number.isFinite(n) ? n : null;
      }
    }
  }

  if (wardKey && type === 'double') {
    const dbl = findDoubleWardRate(bedTariff, wardName);
    if (dbl != null) return dbl;
  }

  if (wardKey) {
    const wardRate = findWardRate(bedTariff, wardName);
    if (wardRate != null) return wardRate;
  }

  return builtinSingleRate(bedTariff, wardKey);
}

/** Prefer rate fields on the bed payload when backend starts returning them. */
export function rateForBed(bed, bedTariff) {
  if (!bed) return resolveBedRate(bedTariff, {});
  const direct = bed.charge_per_day ?? bed.rate ?? bed.price_per_day ?? bed.daily_rate;
  if (direct != null && direct !== '') {
    const n = Number(direct);
    if (Number.isFinite(n)) return n;
  }
  return resolveBedRate(bedTariff, {
    bedNumber: bed.bed_number,
    wardName: bed.ward_name,
    bedType: bed.bed_type,
  });
}
