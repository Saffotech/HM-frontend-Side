import { useMemo } from 'react';
import {
  useNurseBedPatientsQuery,
  useNurseNotesListQuery,
  useNurseVitalsListQuery,
} from '@/shared/hooks/queries/useNurseQuery';
import { useNursePatientScope } from '@/features/nurse/context/NursePatientScopeContext';

function patientIdsWithRecords(items = []) {
  const ids = new Set();
  for (const row of items) {
    const id = Number(row?.patient_id);
    if (Number.isSafeInteger(id) && id >= 1) ids.add(id);
  }
  return ids;
}

/**
 * All bed-assigned patients, with vitals/notes completion flags for the Patient page.
 */
export function useNurseDocumentedPatients(
  { search, page = 1, page_size: pageSize = 10 } = {},
  options = {},
) {
  const { enabled = true } = options;
  const { scopeFilters, scopeReady } = useNursePatientScope();

  const bedQuery = useNurseBedPatientsQuery(
    {
      search: search || undefined,
      page: 1,
      page_size: 100,
      ...scopeFilters,
    },
    { enabled: enabled && scopeReady },
  );
  const vitalsQuery = useNurseVitalsListQuery(
    { page: 1, page_size: 100, ...scopeFilters },
    { enabled: enabled && scopeReady },
  );
  const notesQuery = useNurseNotesListQuery(
    { page: 1, page_size: 100, ...scopeFilters },
    { enabled: enabled && scopeReady },
  );

  const patients = useMemo(() => {
    const vitalIds = patientIdsWithRecords(vitalsQuery.data?.items);
    const noteIds = patientIdsWithRecords(notesQuery.data?.items);
    return (bedQuery.data?.items ?? []).map((patient) => {
      const id = Number(patient.patient_id);
      const hasVitals = Boolean(patient.has_vitals) || vitalIds.has(id);
      const hasNotes = noteIds.has(id);
      return {
        ...patient,
        has_vitals: hasVitals,
        has_notes: hasNotes,
      };
    });
  }, [bedQuery.data?.items, vitalsQuery.data?.items, notesQuery.data?.items]);

  const pendingCareCount = useMemo(
    () => patients.filter((row) => !row.has_vitals || !row.has_notes).length,
    [patients],
  );

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return patients.slice(start, start + pageSize);
  }, [patients, page, pageSize]);

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
      total: patients.length,
      pending_care_count: pendingCareCount,
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
