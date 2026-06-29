import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi } from '@/shared/api/services';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';
import { getTodayRangeIso } from '@/shared/utils/opdDates';

const DEFAULT_PAGE_SIZE = 20;

export function useAppointmentsQuery(options = {}) {
  const { fetchAll = true, page, limit = DEFAULT_PAGE_SIZE, status, date_from, date_to } =
    options;
  const token = useQueryToken();
  const filters = { fetchAll, page, limit, status, date_from, date_to };

  return useQuery({
    queryKey: queryKeys.appointments.list(filters),
    queryFn: async () => {
      if (fetchAll) {
        return appointmentsApi.listAppointmentsAll(token, { status, date_from, date_to });
      }
      return appointmentsApi.listAppointmentsPage(token, {
        page,
        limit,
        status,
        date_from,
        date_to,
      });
    },
  });
}

export function usePatientAppointmentsQuery(
  { patientUid, patientDbId, page = 1, limit = DEFAULT_PAGE_SIZE, enabled = true } = {}
) {
  const token = useQueryToken();
  const filters = { patientUid, patientDbId, page, limit };
  return useQuery({
    queryKey: ['appointments', 'patient', filters],
    queryFn: () =>
      appointmentsApi.listAppointmentsForPatientPage(token, {
        patientUid,
        patientDbId,
        page,
        limit,
      }),
    enabled: enabled && Boolean(patientUid || patientDbId),
  });
}

export function useTodayAppointmentsQuery() {
  const token = useQueryToken();
  const { dateFrom, dateTo } = getTodayRangeIso();
  return useQuery({
    queryKey: queryKeys.appointments.today,
    queryFn: () =>
      appointmentsApi.listAppointmentsPage(token, {
        date_from: dateFrom,
        date_to: dateTo,
        limit: 50,
        page: 1,
      }),
  });
}

export function useBookAppointmentMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appointment) => appointmentsApi.bookAppointment(appointment, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
      queryClient.invalidateQueries({ queryKey: ['appointments', 'list'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.today });
      queryClient.invalidateQueries({ queryKey: queryKeys.opd.dashboard });
    },
    onError: mutationOnError,
  });
}

export function useUpdateAppointmentMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => appointmentsApi.patchAppointment(id, data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
      queryClient.invalidateQueries({ queryKey: ['appointments', 'list'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.today });
      queryClient.invalidateQueries({ queryKey: queryKeys.doctor.appointments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.doctor.queue.all });
    },
    onError: mutationOnError,
  });
}

export function useCancelAppointmentMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => appointmentsApi.cancelAppointmentById(id, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
      queryClient.invalidateQueries({ queryKey: ['appointments', 'list'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.today });
    },
    onError: mutationOnError,
  });
}

export function useDoctorSlotsQuery({ doctorId, departmentId, date, enabled = true } = {}) {
  const token = useQueryToken();
  const dateKey =
    typeof date === 'string' ? date : date?.toISOString?.()?.slice(0, 10) ?? '';

  return useQuery({
    queryKey: ['appointments', 'slots', doctorId, departmentId, dateKey],
    enabled: enabled && Boolean(doctorId && departmentId && dateKey),
    queryFn: () =>
      appointmentsApi.fetchDoctorSlots(token, {
        doctorId,
        departmentId,
        date: dateKey,
      }),
  });
}

export { DEFAULT_PAGE_SIZE as APPOINTMENTS_PAGE_SIZE };
