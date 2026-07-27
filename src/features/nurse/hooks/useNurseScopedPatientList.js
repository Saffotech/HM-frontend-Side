import { useMemo } from 'react';
import { useNursePatientScope } from '@/features/nurse/context/NursePatientScopeContext';

/**
 * Client-side filter for list rows when global scope is Allocated.
 * Prefer passing scopeFilters to APIs that support allocated_only.
 */
export function useNurseScopedPatientList(
  items,
  { getPatientId = (row) => row?.patient_id } = {},
) {
  const { allocatedOnly, allocatedPatientIdSet, scopeReady } = useNursePatientScope();

  return useMemo(() => {
    const rows = items ?? [];
    if (!allocatedOnly || !scopeReady) return rows;
    if (!allocatedPatientIdSet.size) return [];
    return rows.filter((row) => {
      const id = Number(getPatientId(row));
      return Number.isSafeInteger(id) && id >= 1 && allocatedPatientIdSet.has(id);
    });
  }, [items, allocatedOnly, allocatedPatientIdSet, scopeReady, getPatientId]);
}

/** Merge global scope into nurse list query filters (for React Query keys + API params). */
export function useNurseScopeQueryFilters(filters = {}) {
  const { scopeFilters, scopeReady, allocatedOnly } = useNursePatientScope();
  return useMemo(
    () => ({
      ...filters,
      ...(scopeReady && allocatedOnly ? scopeFilters : {}),
      _scopeMode: scopeReady ? (allocatedOnly ? 'allocated' : 'all') : 'pending',
    }),
    [filters, scopeFilters, scopeReady, allocatedOnly],
  );
}
