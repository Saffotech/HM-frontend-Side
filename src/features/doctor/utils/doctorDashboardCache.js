import { keepPreviousData } from '@tanstack/react-query';

import { doctorAppointmentsApi, doctorQueueApi } from '@/shared/api/services';
import { queryKeys } from '@/shared/api/queryKeys';import { todayOpdDate } from '@/features/doctor/utils/doctorDates';

/** Shared React Query options for doctor dashboard data sources. */
export const DOCTOR_DASHBOARD_QUERY_OPTIONS = {
  staleTime: 1000 * 60 * 5,
  gcTime: 1000 * 60 * 10,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  placeholderData: keepPreviousData,
};

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
      ...DOCTOR_DASHBOARD_QUERY_OPTIONS,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.doctor.queue.today,
      queryFn: () => doctorQueueApi.fetchTodayQueue(token),
      ...DOCTOR_DASHBOARD_QUERY_OPTIONS,
    }),
  ]);
}

export function preloadDashboardSectionChunk() {
  return import('@/features/doctor/components/DashboardSection');
}
