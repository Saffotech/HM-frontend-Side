import { useMemo } from 'react';
import {
  useNurseBedPatientsQuery,
  useNurseNotesListQuery,
  useNurseVitalsListQuery,
} from '@/shared/hooks/queries/useNurseQuery';

function patientIdsWithRecords(items = []) {
  const ids = new Set();
  for (const row of items) {
    const id = Number(row?.patient_id);
    if (Number.isSafeInteger(id) && id >= 1) ids.add(id);
  }
  return ids;
}

/**
 * Bed-assigned patients who have both vitals and nursing notes recorded.
 */
export function useNurseDocumentedPatients(
  { search, page = 1, page_size: pageSize = 20 } = {},
  options = {},
) {
  const { enabled = true } = options;

  const bedQuery = useNurseBedPatientsQuery(
    { search: search || undefined, page: 1, page_size: 100 },
    { enabled },
  );
  const vitalsQuery = useNurseVitalsListQuery(
    { page: 1, page_size: 100 },
    { enabled },
  );
  const notesQuery = useNurseNotesListQuery(
    { page: 1, page_size: 100 },
    { enabled },
  );

  const documentedPatients = useMemo(() => {
    const vitalIds = patientIdsWithRecords(vitalsQuery.data?.items);
    const noteIds = patientIdsWithRecords(notesQuery.data?.items);
    return (bedQuery.data?.items ?? []).filter((patient) => {
      const id = Number(patient.patient_id);
      return vitalIds.has(id) && noteIds.has(id);
    });
  }, [bedQuery.data?.items, vitalsQuery.data?.items, notesQuery.data?.items]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return documentedPatients.slice(start, start + pageSize);
  }, [documentedPatients, page, pageSize]);

  const isLoading =
    bedQuery.isLoading || vitalsQuery.isLoading || notesQuery.isLoading;
  const isError = bedQuery.isError || vitalsQuery.isError || notesQuery.isError;
  const error = bedQuery.error ?? vitalsQuery.error ?? notesQuery.error;

  const refetch = () => {
    bedQuery.refetch();
    vitalsQuery.refetch();
    notesQuery.refetch();
  };

  return {
    data: {
      items: paged,
      total: documentedPatients.length,
      page,
      page_size: pageSize,
    },
    isLoading,
    isError,
    error,
    refetch,
    isFetching: bedQuery.isFetching || vitalsQuery.isFetching || notesQuery.isFetching,
  };
}
