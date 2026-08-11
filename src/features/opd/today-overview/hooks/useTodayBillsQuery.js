import { useBillsQuery } from '@/shared/hooks/queries/useBillingQuery';

const TODAY_BILLS_LIMIT = 100;

/** Today's OPD bills for the dashboard card. */
export function useTodayBillsQuery() {
  return useBillsQuery({
    fetchAll: false,
    today_only: true,
    page: 1,
    limit: TODAY_BILLS_LIMIT,
  });
}
