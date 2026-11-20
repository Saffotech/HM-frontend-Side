/**
 * Soft-load bed tariff for IPD UI (rates display).
 * Uses GET /opd/settings when the signed-in user may read it; otherwise stays empty
 * until backend exposes rates on `/ipd/beds` (see backend notes).
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOpdBillingSettings } from '@/features/opd/api/opdSettings';
import { opdSettingsApiToForm } from '@/features/manager/utils/opdSettingsMapper';
import { queryKeys } from '@/shared/api/queryKeys';
import { useIpdWardStatsQuery } from '@/features/ipd/hooks/useIpdQuery';
import { rateForBed, resolveBedRate } from '@/features/ipd/utils/resolveBedRate';

function buildWardRateMap(wardStatsPayload) {
  const map = new Map();
  for (const row of wardStatsPayload?.wards ?? []) {
    const name = String(row.ward || row.ward_name || '').trim().toLowerCase();
    const rate = Number(row.charge_per_day);
    if (name && Number.isFinite(rate)) map.set(name, rate);
  }
  return map;
}

function paymentModeLabel(mode) {
  const code = String(mode?.code || '').toLowerCase();
  if (code === 'upi') return 'UPI';
  if (code) return code.charAt(0).toUpperCase() + code.slice(1);
  return String(mode?.label || '').trim();
}

/** Payment modes the administrator turned off. Empty when settings cannot be read. */
export function useIpdDisabledPaymentModesQuery() {
  return useQuery({
    queryKey: [...queryKeys.ipd.all, 'disabled-payment-modes'],
    queryFn: async () => {
      try {
        const data = await getOpdBillingSettings();
        const form = opdSettingsApiToForm({ ...data, _source: 'api' });
        return (form?.payment_modes?.modes ?? [])
          .filter((mode) => String(mode?.code || '').toLowerCase() !== 'insurance')
          .filter((mode) => mode.enabled === false)
          .map(paymentModeLabel);
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
    retry: false,
  });
}

export function useIpdBedTariffQuery() {
  return useQuery({
    queryKey: [...queryKeys.ipd.all, 'bed-tariff'],
    queryFn: async () => {
      try {
        const data = await getOpdBillingSettings();
        const form = opdSettingsApiToForm({ ...data, _source: 'api' });
        return form?.pricing?.bed_tariff ?? null;
      } catch {
        // IPD role typically lacks opd:view — treat as unavailable, not fatal.
        return null;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useIpdBedRateLookup() {
  const query = useIpdBedTariffQuery();
  const wardsQuery = useIpdWardStatsQuery();
  const bedTariff = query.data;
  const wardRateByName = useMemo(
    () => buildWardRateMap(wardsQuery.data),
    [wardsQuery.data],
  );

  const getRate = useMemo(() => {
    return (bedOrWard, bedNumber) => {
      let rate = null;
      if (bedOrWard && typeof bedOrWard === 'object') {
        rate = rateForBed(bedOrWard, bedTariff);
        if (rate == null) {
          const wardKey = String(bedOrWard.ward_name || '').trim().toLowerCase();
          if (wardKey) rate = wardRateByName.get(wardKey) ?? null;
        }
        return rate;
      }

      rate = resolveBedRate(bedTariff, {
        wardName: bedOrWard,
        bedNumber,
      });
      if (rate == null && bedOrWard) {
        const wardKey = String(bedOrWard).trim().toLowerCase();
        rate = wardRateByName.get(wardKey) ?? null;
      }
      return rate;
    };
  }, [bedTariff, wardRateByName]);

  return {
    ...query,
    bedTariff,
    ratesAvailable: Boolean(bedTariff) || wardRateByName.size > 0,
    getRate,
  };
}
