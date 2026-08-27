import { keepPreviousData } from '@tanstack/react-query';

import { doctorPatientsApi } from '@/shared/api/services';
import { queryKeys } from '@/shared/api/queryKeys';
import { formatVisitDateTime } from '@/features/doctor/utils/patientHistory';
import {
  DOCTOR_ENCOUNTER_MODE,
  matchesDoctorEncounterMode,
  parseDoctorEncounterMode,
} from '@/features/doctor/utils/encounterType';

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
function visitRowsToHistoryPlaceholder(patientUid, visitRows, encounterMode = null) {
  const mode = encounterMode ? parseDoctorEncounterMode(encounterMode) : null;
  const rows = (visitRows ?? []).filter((row) => {
    if (row.patientUid !== patientUid) return false;
    if (!mode) return true;
    return matchesDoctorEncounterMode(row, mode);
  });
  if (!rows.length) return undefined;

  const visits = rows
    .map((row) => ({
      id: row.id,
      appointmentDbId: row.appointmentDbId,
      admissionId: row.admissionId ?? null,
      encounterType: row.encounterType ?? (row.admissionId != null ? 'IPD' : 'OPD'),
      registrationSource: row.registrationSource ?? null,
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
function getPlaceholderPatientHistory(queryClient, patientUid, encounterMode = null) {
  const cachedQueries = queryClient.getQueriesData({
    queryKey: queryKeys.doctor.patients.visits,
  });

  for (const [, data] of cachedQueries) {
    const placeholder = visitRowsToHistoryPlaceholder(patientUid, data?.visits, encounterMode);
    if (placeholder) return placeholder;
  }

  return undefined;
}

export function resolvePatientHistoryPlaceholder(
  queryClient,
  patientUid,
  placeholderVisits,
  encounterMode = null,
) {
  if (placeholderVisits?.length) {
    return visitRowsToHistoryPlaceholder(patientUid, placeholderVisits, encounterMode);
  }
  return getPlaceholderPatientHistory(queryClient, patientUid, encounterMode);
}

export async function prefetchPatientProfileData(
  queryClient,
  token,
  { patientUid, patientId, encounterMode = DOCTOR_ENCOUNTER_MODE.OPD },
) {
  if (!token) return;

  const encounterType = parseDoctorEncounterMode(encounterMode);
  const tasks = [];

  if (patientUid) {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: queryKeys.doctor.patients.history(patientUid, { encounter_type: encounterType }),
        queryFn: () =>
          doctorPatientsApi.fetchPatientHistory(patientUid, token, {
            encounter_type: encounterType,
          }),
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
