import { keepPreviousData } from '@tanstack/react-query';

import {
  doctorAppointmentsApi,
  doctorLabsApi,
  doctorPatientsApi,
  doctorQueueApi,
} from '@/shared/api/services';
import { queryKeys } from '@/shared/api/queryKeys';
import { getDoctorIpdAdmissions } from '@/features/doctor/api/ipd';
import { apiToUiAppointment } from '@/shared/api/mappers/appointmentMapper';
import { todayOpdDate, formatOpdDate } from '@/features/doctor/utils/doctorDates';
import { DOCTOR_ENCOUNTER_MODE } from '@/features/doctor/utils/encounterType';
import {
  buildDoctorPatientsQueryParams,
  DEFAULT_DATE_FILTERS,
} from '@/features/doctor/utils/patientDateFilters';
import { ipdStatusQueryParam, IPD_PATIENT_CATEGORY_FILTER } from '@/features/doctor/utils/patientListFilters';

/** Shared React Query options for doctor dashboard data sources. */
export const DOCTOR_DASHBOARD_QUERY_OPTIONS = {
  staleTime: 30_000,
  gcTime: 1000 * 60 * 10,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchOnMount: true,
  placeholderData: keepPreviousData,
};

/** Live queue / today list — background refresh without manual reload. */
export const DOCTOR_LIVE_QUERY_OPTIONS = {
  ...DOCTOR_DASHBOARD_QUERY_OPTIONS,
  refetchInterval: 60_000,
};

/** IPD admissions — poll frequently so new admits appear without manual refresh. */
export const DOCTOR_IPD_LIVE_QUERY_OPTIONS = {
  ...DOCTOR_DASHBOARD_QUERY_OPTIONS,
  refetchInterval: 30_000,
};

async function fetchDoctorIpdAdmissionsPage(token, filters) {
  const raw = await getDoctorIpdAdmissions(token, filters);
  return {
    items: (raw?.items ?? []).map(apiToUiAppointment).filter(Boolean),
    total: raw?.total ?? 0,
    page: raw?.page ?? 1,
    page_size: raw?.page_size ?? filters.page_size ?? 20,
  };
}

/** Core dashboard views affected by queue / appointment status changes. */
export function invalidateDoctorDashboardCore(queryClient) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.doctor.appointments.today,
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.doctor.appointments.byDate(todayOpdDate()),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.doctor.queue.today,
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.doctor.queue.current,
  });
  queryClient.invalidateQueries({ queryKey: ['doctor', 'ipd'] });
}

export function invalidateDoctorIpdAdmissions(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['doctor', 'ipd'] });
}

/** After consultation completes — also refresh patient-centric lists. */
export function invalidateDoctorDashboardAfterComplete(
  queryClient,
  { patientUid, patientId } = {},
) {
  invalidateDoctorDashboardCore(queryClient);
  queryClient.invalidateQueries({ queryKey: queryKeys.doctor.patients.visits });
  queryClient.invalidateQueries({
    queryKey: queryKeys.doctor.appointments.history,
  });
  if (patientUid) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.doctor.patients.history(patientUid),
    });
  }
  if (patientId != null) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.doctor.patients.prescriptions(patientId),
    });
  }
  queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.opd.dashboard });
  queryClient.invalidateQueries({ queryKey: queryKeys.nurse.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.pharmacy.all });
}

/** Appointment status updates from the appointments API. */
export function invalidateDoctorAppointmentStatusChange(
  queryClient,
  appointmentDbId,
) {
  invalidateDoctorDashboardCore(queryClient);
  queryClient.invalidateQueries({ queryKey: queryKeys.doctor.patients.visits });
  if (appointmentDbId != null) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.doctor.appointments.detail(appointmentDbId),
    });
  }
}

export async function prefetchDoctorDashboard(queryClient, token) {
  if (!token) return;

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.doctor.appointments.today,
      queryFn: () => doctorAppointmentsApi.fetchTodayAppointments(token),
      ...DOCTOR_LIVE_QUERY_OPTIONS,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.doctor.queue.today,
      queryFn: () => doctorQueueApi.fetchTodayQueue(token),
      ...DOCTOR_LIVE_QUERY_OPTIONS,
    }),
  ]);
}

function prefetchDoctorIpdDefault(queryClient, token) {
  const filters = { status: 'admitted', page: 1, page_size: 20 };
  return queryClient.prefetchQuery({
    queryKey: queryKeys.doctor.ipd.admissions(filters),
    queryFn: () => fetchDoctorIpdAdmissionsPage(token, filters),
    ...DOCTOR_IPD_LIVE_QUERY_OPTIONS,
  });
}

function prefetchDoctorCalendarWeek(queryClient, token, dayCount = 7) {
  const days = Array.from({ length: dayCount }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return formatOpdDate(d);
  });

  return Promise.all(
    days.map((uiDate) =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.doctor.appointments.byDate(uiDate),
        queryFn: () => doctorAppointmentsApi.fetchAppointmentsByDate(uiDate, token),
        ...DOCTOR_DASHBOARD_QUERY_OPTIONS,
      }),
    ),
  );
}

function prefetchDoctorCalendarIpd(queryClient, token) {
  const filters = { status: 'admitted', page: 1, page_size: 100 };
  return queryClient.prefetchQuery({
    queryKey: queryKeys.doctor.ipd.admissions(filters),
    queryFn: () => fetchDoctorIpdAdmissionsPage(token, filters),
    ...DOCTOR_IPD_LIVE_QUERY_OPTIONS,
  });
}

function prefetchDoctorPatients(queryClient, token, encounterMode) {
  if (encounterMode === DOCTOR_ENCOUNTER_MODE.IPD) {
    const filters = {
      status: ipdStatusQueryParam(IPD_PATIENT_CATEGORY_FILTER.ADMITTED),
      page: 1,
      page_size: 100,
    };
    return queryClient.prefetchQuery({
      queryKey: queryKeys.doctor.ipd.admissions(filters),
      queryFn: () => fetchDoctorIpdAdmissionsPage(token, filters),
      ...DOCTOR_IPD_LIVE_QUERY_OPTIONS,
    });
  }

  const apiParams = buildDoctorPatientsQueryParams({
    search: '',
    dateFilters: DEFAULT_DATE_FILTERS,
    encounter_type: encounterMode,
  });
  const queryParams = { limit: 100, ...apiParams };
  return Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.doctor.appointments.today,
      queryFn: () => doctorAppointmentsApi.fetchTodayAppointments(token),
      ...DOCTOR_LIVE_QUERY_OPTIONS,
    }),
    queryClient.prefetchQuery({
      queryKey: [...queryKeys.doctor.patients.visits, queryParams],
      queryFn: () => doctorPatientsApi.listPatientVisits(token, queryParams),
      ...DOCTOR_DASHBOARD_QUERY_OPTIONS,
    }),
  ]);
}

function prefetchDoctorLabs(queryClient, token) {
  const apiParams = { limit: 100 };
  return queryClient.prefetchQuery({
    queryKey: [...queryKeys.doctor.labs, apiParams],
    queryFn: () => doctorLabsApi.fetchLabTests(token, apiParams),
    ...DOCTOR_DASHBOARD_QUERY_OPTIONS,
  });
}

/** Warm cache when switching sidebar tabs or OPD/IPD mode. */
export async function prefetchDoctorSection(
  queryClient,
  token,
  { section, encounterMode } = {},
) {
  if (!token || !section) return;

  switch (section) {
    case 'dashboard':
      if (encounterMode === DOCTOR_ENCOUNTER_MODE.IPD) {
        await prefetchDoctorIpdDefault(queryClient, token);
      } else {
        await prefetchDoctorDashboard(queryClient, token);
      }
      break;
    case 'patients':
      await prefetchDoctorPatients(queryClient, token, encounterMode);
      break;
    case 'labs':
      await prefetchDoctorLabs(queryClient, token);
      break;
    case 'schedule':
      if (encounterMode === DOCTOR_ENCOUNTER_MODE.IPD) {
        await prefetchDoctorCalendarIpd(queryClient, token);
      } else {
        await prefetchDoctorCalendarWeek(queryClient, token);
      }
      break;
    default:
      break;
  }
}

export function preloadDashboardSectionChunk() {
  return import('@/features/doctor/components/DashboardSection');
}
