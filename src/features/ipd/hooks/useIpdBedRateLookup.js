/**
 * Soft-load bed tariff for IPD UI (rates display).
 * Uses GET /opd/settings when the signed-in user may read it; otherwise stays empty
 * until backend exposes rates on `/ipd/beds` (see backend notes).
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOpdBillingSettings } from '@/features/opd/api/opdSettings';
import { opdSettingsApiToForm } from '@/features/admin/utils/opdSettingsMapper';
import { queryKeys } from '@/shared/api/queryKeys';
import { rateForBed, resolveBedRate } from '@/features/ipd/utils/resolveBedRate';

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
  const bedTariff = query.data;

  const getRate = useMemo(() => {
    return (bedOrWard, bedNumber) => {
      if (bedOrWard && typeof bedOrWard === 'object') {
        return rateForBed(bedOrWard, bedTariff);
      }
      return resolveBedRate(bedTariff, {
        wardName: bedOrWard,
        bedNumber,
      });
    };
  }, [bedTariff]);

  return {
    ...query,
    bedTariff,
    ratesAvailable: Boolean(bedTariff),
    getRate,
  };
}
