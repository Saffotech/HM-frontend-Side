/**
 * Resolve bed ₹/day the same way as backend `opd_settings_service.resolve_bed_rate`:
 * special bed → ward_rates → ICU/Private/General defaults.
 */

export function resolveBedRate(bedTariff, { bedNumber, wardName } = {}) {
  if (!bedTariff) return null;

  const bedKey = String(bedNumber || '').trim().toLowerCase();
  const wardKey = String(wardName || '').trim().toLowerCase();

  if (bedKey) {
    for (const row of bedTariff.special_bed_rates || []) {
      if (String(row.bed_number || '').trim().toLowerCase() === bedKey) {
        const n = Number(row.charge_per_day);
        return Number.isFinite(n) ? n : null;
      }
    }
  }

  if (wardKey) {
    for (const row of bedTariff.ward_rates || []) {
      if (String(row.ward_name || '').trim().toLowerCase() === wardKey) {
        const n = Number(row.charge_per_day);
        return Number.isFinite(n) ? n : null;
      }
    }
  }

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
  });
}
