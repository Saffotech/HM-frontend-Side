import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billsApi } from '@/shared/api/services';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';

const DEFAULT_PAGE_SIZE = 20;
const PAYMENT_HISTORY_PAGE_SIZE = 10;

export function useBillsQuery(options = {}) {
  const {
    fetchAll = true,
    search,
    page,
    limit = DEFAULT_PAGE_SIZE,
    status,
    today_only,
    from_date,
    to_date,
    enabled = true,
  } = options;
  const token = useQueryToken();
  const filters = { fetchAll, search, page, limit, status, today_only, from_date, to_date };

  return useQuery({
    queryKey: queryKeys.bills.list(filters),
    enabled,
    queryFn: async () => {
      if (fetchAll) {
        return billsApi.listBillsAll(token, { search, status, today_only, from_date, to_date });
      }
      return billsApi.listBillsPage(token, {
        search,
        page,
        limit,
        status,
        today_only,
        from_date,
        to_date,
      });
    },
  });
}

export function usePaymentHistoryQuery({ search = '', modeFilter = 'all', page = 1 } = {}) {
  const token = useQueryToken();
  const filters = { search, modeFilter, page, limit: PAYMENT_HISTORY_PAGE_SIZE };
  return useQuery({
    queryKey: queryKeys.bills.paymentHistory(filters),
    queryFn: () => billsApi.listPaymentHistory(token, filters),
  });
}

export function useBillInvoiceQuery(visitId, options = {}) {
  const { enabled = true } = options;
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.bills.invoice(visitId),
    queryFn: () => billsApi.getBillInvoice(visitId, token),
    enabled: enabled && visitId != null && visitId !== '',
  });
}

export { PAYMENT_HISTORY_PAGE_SIZE, DEFAULT_PAGE_SIZE as BILLS_PAGE_SIZE };

export function useCreateBillMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bill) => billsApi.addBill(bill, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bills.all });
      queryClient.invalidateQueries({ queryKey: ['bills', 'list'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.opd.dashboard });
    },
    onError: mutationOnError,
  });
}

export function useCollectPaymentMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ billId, payment }) => billsApi.collectBillPayment(billId, payment, token),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bills.all });
      queryClient.invalidateQueries({ queryKey: ['bills', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['bills', 'invoice'] });
      queryClient.invalidateQueries({ queryKey: ['bills', 'payment-history'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.opd.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
      queryClient.invalidateQueries({ queryKey: ['appointments', 'list'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.today });
      await queryClient.refetchQueries({ queryKey: ['appointments', 'list'], type: 'active' });
    },
    onError: mutationOnError,
  });
}

export function useUpdateBillMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ visitId, data }) => billsApi.patchBill(visitId, data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bills.all });
      queryClient.invalidateQueries({ queryKey: ['bills', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['bills', 'invoice'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.opd.dashboard });
    },
    onError: mutationOnError,
  });
}

export function useDeleteBillMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (visitId) => billsApi.removeBill(visitId, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bills.all });
      queryClient.invalidateQueries({ queryKey: ['bills', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['bills', 'invoice'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.opd.dashboard });
    },
    onError: mutationOnError,
  });
}
