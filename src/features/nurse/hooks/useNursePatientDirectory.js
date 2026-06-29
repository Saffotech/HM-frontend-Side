import { useMemo } from 'react';
import { mergeNursePatientDirectory } from '@/shared/api/mappers/nurseMapper';
import {
  useNurseQueueQuery,
  useNurseMedicationPatientsQuery,
} from '@/shared/hooks/queries/useNurseQuery';
import { NURSE_QUEUE_MAX_PAGE_SIZE } from '@/shared/api/services/nurse';

/**
 * Searchable nurse patient directory (today's queue + active medication patients).
 * UHID comes from existing APIs — no backend change.
 */
export function useNursePatientDirectory(options = {}) {
  const { enabled = true } = options;
  const queueQuery = useNurseQueueQuery(
    { page: 1, page_size: NURSE_QUEUE_MAX_PAGE_SIZE },
    { enabled },
  );
  const medsQuery = useNurseMedicationPatientsQuery(
    { page: 1, page_size: NURSE_QUEUE_MAX_PAGE_SIZE },
    { enabled },
  );

  const patients = useMemo(
    () => mergeNursePatientDirectory(queueQuery.data?.items, medsQuery.data?.items),
    [queueQuery.data?.items, medsQuery.data?.items],
  );

  return {
    patients,
    isLoading: queueQuery.isLoading || medsQuery.isLoading,
    isError: queueQuery.isError || medsQuery.isError,
    error: queueQuery.error ?? medsQuery.error,
    refetch: () => {
      queueQuery.refetch();
      medsQuery.refetch();
    },
  };
}
