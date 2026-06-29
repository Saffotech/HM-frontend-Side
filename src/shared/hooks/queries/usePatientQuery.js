import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientsApi } from '@/shared/api/services';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';

const DEFAULT_PAGE_SIZE = 20;

export function usePatientsQuery(options = {}) {
  const { fetchAll = true, search, page, limit = DEFAULT_PAGE_SIZE, enabled = true } = options;
  const token = useQueryToken();
  const filters = { fetchAll, search, page, limit };

  return useQuery({
    queryKey: queryKeys.patients.list(filters),
    enabled,
    queryFn: async () => {
      if (fetchAll) {
        return patientsApi.listPatientsAll(token, { search });
      }
      const result = await patientsApi.listPatientsPage(token, { search, page, limit });
      return result;
    },
  });
}

export function usePatientQuery(id) {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.patients.detail(id),
    queryFn: () => patientsApi.getPatient(id, token),
    enabled: Boolean(id),
  });
}

export function usePatientProfileQuery(patientDbId) {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.patients.profile(patientDbId),
    queryFn: () => patientsApi.getPatientProfileById(patientDbId, token),
    enabled: patientDbId != null && !Number.isNaN(Number(patientDbId)),
  });
}

export function useAddPatientMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patient) => patientsApi.addPatient(patient, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
      queryClient.invalidateQueries({ queryKey: ['patients', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['patients', 'profile'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.opd.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.bills.all });
      queryClient.invalidateQueries({ queryKey: ['bills', 'list'] });
    },
    onError: mutationOnError,
  });
}

export function useAddOpdVisitMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patient) => patientsApi.addOpdVisit(patient, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
      queryClient.invalidateQueries({ queryKey: ['patients', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['patients', 'profile'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.opd.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.bills.all });
      queryClient.invalidateQueries({ queryKey: ['bills', 'list'] });
    },
    onError: mutationOnError,
  });
}

export function useUpdatePatientMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => patientsApi.patchPatient(id, data, token),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
      queryClient.invalidateQueries({ queryKey: ['patients', 'list'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.detail(id) });
    },
    onError: mutationOnError,
  });
}

export function useDeletePatientMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => patientsApi.removePatient(id, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
      queryClient.invalidateQueries({ queryKey: ['patients', 'list'] });
    },
    onError: mutationOnError,
  });
}

export { DEFAULT_PAGE_SIZE as PATIENTS_PAGE_SIZE };
