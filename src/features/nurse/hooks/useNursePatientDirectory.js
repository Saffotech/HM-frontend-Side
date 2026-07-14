import { useMemo } from 'react';
import { mergeNursePatientDirectory } from '@/shared/api/mappers/nurseMapper';
import {
  useNurseBedPatientsQuery,
  useNurseMedicationPatientsQuery,
} from '@/shared/hooks/queries/useNurseQuery';
import { NURSE_QUEUE_MAX_PAGE_SIZE } from '@/shared/api/services/nurse';

/**
 * Searchable nurse patient directory (bed-assigned + active medication patients).
 */
export function useNursePatientDirectory(options = {}) {
  const { enabled = true } = options;
  const bedQuery = useNurseBedPatientsQuery(
    { page: 1, page_size: NURSE_QUEUE_MAX_PAGE_SIZE },
    { enabled },
  );
  const medsQuery = useNurseMedicationPatientsQuery(
    { page: 1, page_size: NURSE_QUEUE_MAX_PAGE_SIZE },
    { enabled },
  );

  const patients = useMemo(
    () => mergeNursePatientDirectory(bedQuery.data?.items, medsQuery.data?.items),
    [bedQuery.data?.items, medsQuery.data?.items],
  );

  return {
    patients,
    isLoading: bedQuery.isLoading || medsQuery.isLoading,
    isError: bedQuery.isError || medsQuery.isError,
    error: bedQuery.error ?? medsQuery.error,
    refetch: () => {
      bedQuery.refetch();
      medsQuery.refetch();
    },
  };
}
