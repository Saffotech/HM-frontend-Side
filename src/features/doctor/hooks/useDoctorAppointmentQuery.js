import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';

import { doctorAppointmentsApi } from '@/shared/api/services';

import { queryKeys } from '@/shared/api/queryKeys';

import { useQueryToken } from '@/shared/hooks/useQueryToken';

import { mutationOnError } from '@/shared/utils/mutationErrors';

import { formatOpdDate } from '@/features/doctor/utils/doctorDates';

import {
  DOCTOR_DASHBOARD_QUERY_OPTIONS,
  invalidateDoctorAppointmentStatusChange,
} from '@/features/doctor/utils/doctorDashboardCache';
import { selectDashboardAppointments } from '@/features/doctor/utils/doctorDashboardSelectors';



export function useDoctorTodayAppointmentsQuery() {

  const token = useQueryToken();

  return useQuery({

    queryKey: queryKeys.doctor.appointments.today,

    queryFn: () => doctorAppointmentsApi.fetchTodayAppointments(token),

    ...DOCTOR_DASHBOARD_QUERY_OPTIONS,

  });

}



/** Dashboard observer — same cache key as today appointments, slim select projection. */
export function useDoctorDashboardTodayAppointmentsQuery() {

  const token = useQueryToken();

  return useQuery({

    queryKey: queryKeys.doctor.appointments.today,

    queryFn: () => doctorAppointmentsApi.fetchTodayAppointments(token),

    select: selectDashboardAppointments,

    ...DOCTOR_DASHBOARD_QUERY_OPTIONS,

  });

}



export function useDoctorAppointmentsByDateQuery(uiDate) {

  const token = useQueryToken();

  return useQuery({

    queryKey: queryKeys.doctor.appointments.byDate(uiDate),

    queryFn: () => doctorAppointmentsApi.fetchAppointmentsByDate(uiDate, token),

    enabled: Boolean(uiDate),

  });

}



/** Week-at-a-glance: one GET /appointments/by-date/{date} per day from today. */

export function useDoctorWeekAppointmentsQueries(dayCount = 14) {

  const token = useQueryToken();

  const days = Array.from({ length: dayCount }, (_, i) => {

    const d = new Date();

    d.setDate(d.getDate() + i);

    return formatOpdDate(d);

  });



  return useQueries({

    queries: days.map((uiDate) => ({

      queryKey: queryKeys.doctor.appointments.byDate(uiDate),

      queryFn: () => doctorAppointmentsApi.fetchAppointmentsByDate(uiDate, token),

      staleTime: 30_000,

    })),

    combine: (results) => ({

      days,

      byDate: Object.fromEntries(days.map((d, i) => [d, results[i]?.data ?? []])),

      isLoading: results.some((r) => r.isLoading),

      isError: results.some((r) => r.isError),

    }),

  });

}



export function useDoctorAppointmentsHistoryQuery() {

  const token = useQueryToken();

  return useQuery({

    queryKey: queryKeys.doctor.appointments.history,

    queryFn: () => doctorAppointmentsApi.fetchAppointmentsHistory(token),

  });

}



/** GET /appointments/{id} — always fetch fresh detail from API. */

export function useDoctorAppointmentDetailQuery(appointmentDbId, options = {}) {

  const { enabled = true } = options;

  const token = useQueryToken();

  return useQuery({

    queryKey: queryKeys.doctor.appointments.detail(appointmentDbId),

    queryFn: () => doctorAppointmentsApi.fetchAppointmentById(appointmentDbId, token),

    enabled: enabled && appointmentDbId != null,

  });

}



/** PUT /appointments/{id}/status — requires appointments:update permission on backend */

export function useUpdateDoctorAppointmentStatusMutation() {

  const token = useQueryToken();

  const queryClient = useQueryClient();

  return useMutation({

    mutationFn: ({ appointment, data }) =>

      doctorAppointmentsApi.putAppointmentStatus(appointment, data, token),

    onSuccess: (_data, variables) => {

      invalidateDoctorAppointmentStatusChange(

        queryClient,

        variables?.appointment?.dbId ?? variables?.appointment?.id,

      );

    },

    onError: mutationOnError,

  });

}


