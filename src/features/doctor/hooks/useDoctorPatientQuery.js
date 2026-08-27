import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { doctorPatientsApi } from '@/shared/api/services';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import {
  DOCTOR_PATIENT_HISTORY_QUERY_OPTIONS,
  DOCTOR_PATIENT_PRESCRIPTIONS_QUERY_OPTIONS,
  resolvePatientHistoryPlaceholder,
} from '@/features/doctor/utils/doctorPatientProfileCache';
import { DOCTOR_DASHBOARD_QUERY_OPTIONS } from '@/features/doctor/utils/doctorDashboardCache';
import {
  mergeNurseDoctorVisits,
  nurseVisitDatesFromAdmissions,
  todayIsoDate,
} from '@/features/doctor/utils/nurseDoctorVisitDates';

export function useDoctorPatientVisitsQuery(params = {}, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  const queryParams = { limit: 100, ...params };

  return useQuery({
    queryKey: [...queryKeys.doctor.patients.visits, queryParams],
    queryFn: () => doctorPatientsApi.listPatientVisits(token, queryParams),
    enabled: Boolean(token) && enabled,
    ...DOCTOR_DASHBOARD_QUERY_OPTIONS,
  });
}

export function useDoctorPatientHistoryQuery(patientUhid, options = {}) {
  const { enabled = true, placeholderVisits, encounter_type = 'opd' } = options;
  const token = useQueryToken();
  const queryClient = useQueryClient();
  const uid = patientUhid?.patientUid ?? patientUhid;
  const encounterType = String(encounter_type || 'opd').toLowerCase();

  return useQuery({
    queryKey: queryKeys.doctor.patients.history(uid, { encounter_type: encounterType }),
    queryFn: () =>
      doctorPatientsApi.fetchPatientHistory(uid, token, { encounter_type: encounterType }),
    enabled: Boolean(uid) && enabled,
    ...DOCTOR_PATIENT_HISTORY_QUERY_OPTIONS,
    placeholderData: (previousData) => {
      if (previousData) return previousData;
      return resolvePatientHistoryPlaceholder(queryClient, uid, placeholderVisits, encounterType);
    },
  });
}

export function useDoctorPatientPrescriptionsQuery(patientId, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();

  return useQuery({
    queryKey: queryKeys.doctor.patients.prescriptions(patientId),
    queryFn: () => doctorPatientsApi.fetchPatientPrescriptions(patientId, token),
    enabled:
      enabled &&
      patientId != null &&
      !Number.isNaN(Number(patientId)),
    ...DOCTOR_PATIENT_PRESCRIPTIONS_QUERY_OPTIONS,
  });
}

/**
 * Nurse-recorded doctor visits for a patient.
 * Pass `admissions` (IPD rows) to load visits across the stay — the API is day-scoped.
 */
export function useDoctorPatientVisitsForPatientQuery(patientId, patientUid, options = {}) {
  const { enabled = true, admissions = null, dates: datesOption = null } = options;
  const token = useQueryToken();

  const dates = useMemo(() => {
    if (Array.isArray(datesOption) && datesOption.length) {
      return [...new Set(datesOption.filter(Boolean))].sort();
    }
    if (Array.isArray(admissions)) {
      return nurseVisitDatesFromAdmissions(admissions);
    }
    return [todayIsoDate()].filter(Boolean);
  }, [admissions, datesOption]);

  const params = {};
  if (patientId != null && !Number.isNaN(Number(patientId))) params.patient_id = Number(patientId);
  if (patientUid) params.patient_uid = patientUid;

  return useQuery({
    queryKey: queryKeys.doctor.patients.patientVisits({ ...params, dates }),
    queryFn: async () => {
      const dayResponses = await Promise.all(
        dates.map(async (visit_date) => {
          try {
            return await doctorPatientsApi.fetchDoctorPatientVisits(token, {
              ...params,
              visit_date,
            });
          } catch {
            return null;
          }
        }),
      );
      return mergeNurseDoctorVisits(dayResponses);
    },
    enabled:
      enabled &&
      Boolean(token) &&
      (params.patient_id != null || Boolean(params.patient_uid)) &&
      dates.length > 0,
    staleTime: 30 * 1000,
  });
}

export function useDoctorPatientVitalsQuery(patientId, filters = {}, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  const numericId = Number(patientId);
  const hasPatientId = Number.isFinite(numericId) && numericId >= 1;
  const queryFilters = {
    page: filters.page ?? 1,
    page_size: filters.page_size ?? 20,
    ...(filters.from_date ? { from_date: filters.from_date } : {}),
    ...(filters.to_date ? { to_date: filters.to_date } : {}),
  };

  return useQuery({
    queryKey: queryKeys.doctor.patients.vitals(hasPatientId ? numericId : null, queryFilters),
    queryFn: () => doctorPatientsApi.fetchDoctorPatientVitals(numericId, token, queryFilters),
    enabled: Boolean(token) && enabled && hasPatientId,
    staleTime: 30 * 1000,
  });
}

export function useDoctorPatientNotesQuery(patientId, filters = {}, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  const numericId = Number(patientId);
  const hasPatientId = Number.isFinite(numericId) && numericId >= 1;
  const queryFilters = {
    page: filters.page ?? 1,
    page_size: filters.page_size ?? 20,
    ...(filters.from_date ? { from_date: filters.from_date } : {}),
    ...(filters.to_date ? { to_date: filters.to_date } : {}),
  };

  return useQuery({
    queryKey: queryKeys.doctor.patients.notes(hasPatientId ? numericId : null, queryFilters),
    queryFn: () => doctorPatientsApi.fetchDoctorPatientNotes(numericId, token, queryFilters),
    enabled: Boolean(token) && enabled && hasPatientId,
    staleTime: 30 * 1000,
  });
}
