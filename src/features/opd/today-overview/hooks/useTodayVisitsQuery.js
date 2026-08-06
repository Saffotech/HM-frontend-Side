import { useQuery } from '@tanstack/react-query';
import { getTodayBillingVisits } from '@/features/opd/api/dashboard';
import { mapOpdVisitList } from '@/shared/api/mappers/visitMapper';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { getTodayRangeIso } from '@/shared/utils/opdDates';

/** Today's registered OPD billing visits (GET /opd/visits/today). */
export function useTodayVisitsQuery() {
  const token = useQueryToken();
  const { dateKey } = getTodayRangeIso();

  return useQuery({
    queryKey: ['opd', 'visits', 'today', dateKey],
    queryFn: async () => {
      const raw = await getTodayBillingVisits(token);
      const visits = mapOpdVisitList(raw);
      return { visits, total: raw?.total ?? visits.length };
    },
    staleTime: 30_000,
    retry: 1,
  });
}
