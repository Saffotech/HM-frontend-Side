import { useQuery } from '@tanstack/react-query';
import { opdDashboardApi } from '@/shared/api/services';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';

export function useOpdDashboardQuery() {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.opd.dashboard,
    queryFn: () => opdDashboardApi.fetchOpdDashboard(token),
  });
}
