import { useMemo } from 'react';
import { mergeNursePatientDirectory } from '@/shared/api/mappers/nurseMapper';
import {
  useNurseBedPatientsQuery,
  useNurseMedicationPatientsQuery,
} from '@/shared/hooks/queries/useNurseQuery';
import { NURSE_QUEUE_MAX_PAGE_SIZE } from '@/shared/api/services/nurse';
import { useNursePatientScope } from '@/features/nurse/context/NursePatientScopeContext';

/**
 * Searchable nurse patient directory (bed-assigned + active medication patients).
 *
 * @param {object} options
 * @param {boolean} [options.enabled=true]
 * @param {boolean|null} [options.allocatedOnly] When omitted, follows global Allocated / All scope.
 */
export function useNursePatientDirectory(options = {}) {
  const { enabled = true, allocatedOnly: allocatedOnlyOverride = null } = options;
  const { scopeFilters, allocatedOnly: scopeAllocated, scopeReady } = useNursePatientScope();
  const allocatedOnly = allocatedOnlyOverride ?? scopeAllocated;

  const bedFilters = useMemo(
    () => ({
      page: 1,
      page_size: NURSE_QUEUE_MAX_PAGE_SIZE,
      ...(allocatedOnly ? scopeFilters : {}),
    }),
    [allocatedOnly, scopeFilters],
  );

  const bedQuery = useNurseBedPatientsQuery(bedFilters, {
    enabled: enabled && scopeReady,
  });

  const medsQuery = useNurseMedicationPatientsQuery(
    { page: 1, page_size: NURSE_QUEUE_MAX_PAGE_SIZE },
    { enabled: enabled && scopeReady && !allocatedOnly },
  );

  const patients = useMemo(() => {
    if (allocatedOnly) {
      return mergeNursePatientDirectory(bedQuery.data?.items);
    }
    return mergeNursePatientDirectory(bedQuery.data?.items, medsQuery.data?.items);
  }, [allocatedOnly, bedQuery.data?.items, medsQuery.data?.items]);

  return {
    patients,
    isLoading: bedQuery.isLoading || (!allocatedOnly && medsQuery.isLoading),
    isError: bedQuery.isError || (!allocatedOnly && medsQuery.isError),
    error: bedQuery.error ?? medsQuery.error,
    refetch: () => {
      bedQuery.refetch();
      if (!allocatedOnly) medsQuery.refetch();
    },
  };
}
