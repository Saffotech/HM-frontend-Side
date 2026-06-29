import { keepPreviousData } from '@tanstack/react-query';

import { doctorPatientsApi } from '@/shared/api/services';
import { queryKeys } from '@/shared/api/queryKeys';
import { formatVisitDateTime } from '@/features/doctor/utils/patientHistory';

export const DOCTOR_PATIENT_HISTORY_QUERY_OPTIONS = {
  staleTime: 1000 * 60 * 5,
  gcTime: 1000 * 60 * 10,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  placeholderData: keepPreviousData,
};

export const DOCTOR_PATIENT_PRESCRIPTIONS_QUERY_OPTIONS = {
  staleTime: 1000 * 60 * 5,
  gcTime: 1000 * 60 * 10,
  refetchOnWindowFocus: false,
};

/** Build visit-history shape from already-loaded patient visit list rows (instant placeholder). */
export function visitRowsToHistoryPlaceholder(patientUid, visitRows) {
  const rows = (visitRows ?? []).filter((row) => row.patientUid === patientUid);
  if (!rows.length) return undefined;

  const visits = rows
    .map((row) => ({
      id: row.id,
      appointmentDbId: row.appointmentDbId,
      scheduledAt: row.scheduledAt,
      dateTime: formatVisitDateTime(null, row.scheduledAt),
      sortTime: row.scheduledAt ? new Date(row.scheduledAt).getTime() : 0,
      symptoms: row.symptoms || '—',
      diagnosis: row.diagnosis || '—',
      notes: row.notes || '—',
      followUp: row.followUp || '—',
      status: row.status,
      medicines: [],
    }))
    .sort((a, b) => b.sortTime - a.sortTime);

  return {
    patientUid,
    patientId: rows[0]?.patientId ?? null,
    phone: rows[0]?.phone ?? null,
    visits,
  };
}

/** Read cached patients list queries to show visit history immediately while detail API loads. */
export function getPlaceholderPatientHistory(queryClient, patientUid) {
  const cachedQueries = queryClient.getQueriesData({
    queryKey: queryKeys.doctor.patients.visits,
  });

  for (const [, data] of cachedQueries) {
    const placeholder = visitRowsToHistoryPlaceholder(patientUid, data?.visits);
    if (placeholder) return placeholder;
  }

  return undefined;
}

export function resolvePatientHistoryPlaceholder(
  queryClient,
  patientUid,
  placeholderVisits,
) {
  if (placeholderVisits?.length) {
    return visitRowsToHistoryPlaceholder(patientUid, placeholderVisits);
  }
  return getPlaceholderPatientHistory(queryClient, patientUid);
}

export async function prefetchPatientProfileData(queryClient, token, { patientUid, patientId }) {
  if (!token) return;

  const tasks = [];

  if (patientUid) {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: queryKeys.doctor.patients.history(patientUid),
        queryFn: () => doctorPatientsApi.fetchPatientHistory(patientUid, token),
        ...DOCTOR_PATIENT_HISTORY_QUERY_OPTIONS,
      }),
    );
  }

  if (patientId != null && !Number.isNaN(Number(patientId))) {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: queryKeys.doctor.patients.prescriptions(patientId),
        queryFn: () => doctorPatientsApi.fetchPatientPrescriptions(patientId, token),
        ...DOCTOR_PATIENT_PRESCRIPTIONS_QUERY_OPTIONS,
      }),
    );
  }

  await Promise.all(tasks);
}
