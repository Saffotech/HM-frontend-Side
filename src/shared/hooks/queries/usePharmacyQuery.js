import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPrescriptions,
  fetchPrescriptionById,
  submitDispense,
  fetchDispenseHistory,
  fetchPrescriptionDispenseHistory,
  fetchPharmacyDashboardStats,
} from '@/shared/api/services/pharmacy';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';

export const PHARMACY_HISTORY_PAGE_SIZES = [10, 20, 50];

export function usePharmacyPrescriptionsQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.pharmacy.prescriptions(filters),
    enabled,
    queryFn: () => fetchPrescriptions(filters, token),
  });
}

export function usePharmacyPrescriptionQuery(id, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.pharmacy.prescription(id),
    enabled: enabled && Boolean(id),
    queryFn: () => fetchPrescriptionById(id, token),
  });
}

export function usePharmacyHistoryQuery({
  page = 1,
  limit = 20,
  date_from,
  date_to,
  enabled = true,
} = {}) {
  const token = useQueryToken();
  const params = { page, limit, date_from, date_to };
  return useQuery({
    queryKey: queryKeys.pharmacy.history(params),
    enabled,
    queryFn: () => fetchDispenseHistory(token, params),
  });
}

export function usePrescriptionDispenseHistoryQuery(prescriptionId, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.pharmacy.prescriptionHistory(prescriptionId),
    enabled: enabled && Boolean(prescriptionId),
    queryFn: () => fetchPrescriptionDispenseHistory(prescriptionId, token),
  });
}

export function usePharmacyDashboardStatsQuery(options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.pharmacy.dashboard,
    enabled,
    queryFn: () => fetchPharmacyDashboardStats(token),
  });
}

export function useDispenseMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ prescriptionId, body }) => submitDispense(prescriptionId, body, token),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pharmacy.all });
      if (variables?.prescriptionId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.pharmacy.prescription(variables.prescriptionId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.pharmacy.prescriptionHistory(variables.prescriptionId),
        });
      }
    },
  });
}
