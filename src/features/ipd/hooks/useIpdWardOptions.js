/**
 * Live ward names from IPD inventory (`GET /ipd/beds/wards`).
 * Replaces hardcoded WARDS so Admit / Beds match Super Admin inventory.
 */

import { useMemo } from 'react';
import { useIpdBedsQuery, useIpdWardStatsQuery } from '@/features/ipd/hooks/useIpdQuery';

export function useIpdWardOptions() {
  const wardsQuery = useIpdWardStatsQuery();
  const bedsQuery = useIpdBedsQuery({});

  const wardOptions = useMemo(() => {
    const fromStats = (wardsQuery.data?.wards ?? [])
      .map((row) => String(row.ward || row.ward_name || '').trim())
      .filter(Boolean);

    if (fromStats.length) {
      return [...new Set(fromStats)].sort((a, b) => a.localeCompare(b));
    }

    // Fallback if wards endpoint empty but beds exist
    const fromBeds = (bedsQuery.data?.beds ?? [])
      .map((bed) => String(bed.ward_name || '').trim())
      .filter(Boolean);
    return [...new Set(fromBeds)].sort((a, b) => a.localeCompare(b));
  }, [wardsQuery.data, bedsQuery.data]);

  return {
    wardOptions,
    isLoading: wardsQuery.isLoading && bedsQuery.isLoading,
    isError: wardsQuery.isError && bedsQuery.isError,
    error: wardsQuery.error || bedsQuery.error,
    refetch: () => {
      wardsQuery.refetch();
      bedsQuery.refetch();
    },
  };
}
