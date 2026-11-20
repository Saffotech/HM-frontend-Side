import { useQuery } from '@tanstack/react-query';
import { getReportsVisits } from '@/features/manager/api/manager';
import { queryKeys } from '@/shared/api/queryKeys';

/**
 * Loads the visit report from GET /admin-manager/reports/visits.
 * The page passes filters. This hook calls getReportsVisits. That function calls apiClient.
 */
export function useVisitReportQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.admin.reportsVisits(filters),
    enabled,
    queryFn: () => getReportsVisits(filters),
  });
}
