import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchLabDashboardStats,
  fetchLabOrders,
  fetchLabOrderById,
  fetchLabReports,
  fetchLabReportById,
  submitLabOrderWorkflow,
  downloadLabReportFile,
} from '@/shared/api/services/lab';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';

export function useLabDashboardQuery(options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.lab.dashboard,
    enabled: enabled && Boolean(token),
    queryFn: () => fetchLabDashboardStats(token),
  });
}

export function useLabOrdersQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.lab.orders(filters),
    enabled: enabled && Boolean(token),
    queryFn: () => fetchLabOrders(filters, token),
  });
}

export function useLabOrderQuery(orderId, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.lab.order(orderId),
    enabled: enabled && orderId != null && Boolean(token),
    queryFn: () => fetchLabOrderById(orderId, token),
  });
}

export function useLabReportsQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.lab.reports(filters),
    enabled: enabled && Boolean(token),
    queryFn: () => fetchLabReports(filters, token),
  });
}

export function useLabReportQuery(reportId, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.lab.report(reportId),
    enabled: enabled && reportId != null && Boolean(token),
    queryFn: () => fetchLabReportById(reportId, token),
  });
}

export function useSubmitLabWorkflowMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, currentStatus, form, file }) =>
      submitLabOrderWorkflow(orderId, { currentStatus, form, file }, token),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lab.all });
      if (variables?.orderId != null) {
        queryClient.invalidateQueries({ queryKey: queryKeys.lab.order(variables.orderId) });
      }
    },
    onError: mutationOnError,
  });
}

export function useDownloadLabReportFileMutation() {
  const token = useQueryToken();
  return useMutation({
    mutationFn: (reportId) => downloadLabReportFile(reportId, token),
    onError: mutationOnError,
  });
}

function invalidateLabQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.lab.all });
}

export { invalidateLabQueries };
