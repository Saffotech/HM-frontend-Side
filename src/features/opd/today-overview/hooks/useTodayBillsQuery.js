import { useBillsQuery } from '@/shared/hooks/queries/useBillingQuery';

const TODAY_BILLS_LIMIT = 100;

/**
 * Today's OPD bills — shared by the dashboard card and the Today's Overview page
 * so both read from the same cache entry.
 */
export function useTodayBillsQuery() {
  return useBillsQuery({
    fetchAll: false,
    today_only: true,
    page: 1,
    limit: TODAY_BILLS_LIMIT,
  });
}

export { TODAY_BILLS_LIMIT };
