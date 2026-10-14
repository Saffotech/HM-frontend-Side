/**
 * Live ward names from IPD inventory (`GET /ipd/beds/wards`).
 * Replaces hardcoded WARDS so Admit / Beds match Super Admin inventory.
 */

import { useMemo } from 'react';
import { useIpdBedsQuery, useIpdWardStatsQuery } from '@/features/ipd/hooks/useIpdQuery';

export function useIpdWardOptions() {
  const wardsQuery = useIpdWardStatsQuery();

  const wardNamesFromStats = useMemo(
    () =>
      (wardsQuery.data?.wards ?? [])
        .map((row) => String(row.ward || row.ward_name || '').trim())
        .filter(Boolean),
    [wardsQuery.data],
  );

  const needsBedsFallback =
    wardsQuery.isSuccess && wardNamesFromStats.length === 0;

  const bedsQuery = useIpdBedsQuery({}, { enabled: needsBedsFallback });

  const wardOptions = useMemo(() => {
    if (wardNamesFromStats.length) {
      return [...new Set(wardNamesFromStats)].sort((a, b) => a.localeCompare(b));
    }

    const fromBeds = (bedsQuery.data?.beds ?? [])
      .map((bed) => String(bed.ward_name || '').trim())
      .filter(Boolean);
    return [...new Set(fromBeds)].sort((a, b) => a.localeCompare(b));
  }, [wardNamesFromStats, bedsQuery.data]);

  return {
    wardOptions,
    isLoading:
      wardsQuery.isLoading || (needsBedsFallback && bedsQuery.isLoading),
    isError:
      wardsQuery.isError || (needsBedsFallback && bedsQuery.isError),
    error: wardsQuery.error || bedsQuery.error,
    refetch: () => {
      wardsQuery.refetch();
      if (needsBedsFallback) {
        bedsQuery.refetch();
      }
    },
  };
}
