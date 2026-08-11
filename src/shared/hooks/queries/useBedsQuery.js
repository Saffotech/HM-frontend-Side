import { useQuery } from '@tanstack/react-query';

import { bedsApi } from '@/shared/api/services';

import { queryKeys } from '@/shared/api/queryKeys';

import { useQueryToken } from '@/shared/hooks/useQueryToken';

function normalizeBedStatusFilter(status) {
  if (!status || status === 'All') return undefined;
  return String(status).toLowerCase();
}

function normalizeBedWardFilter(ward) {
  if (!ward || ward === 'All') return undefined;
  return ward;
}

export function useBedsQuery(options = {}) {
  const {
    enabled = true,
    ward,
    status,
    search,
  } = options;
  const token = useQueryToken();
  const filters = {
    ward: normalizeBedWardFilter(ward),
    status: normalizeBedStatusFilter(status),
    search: search?.trim() || undefined,
  };

  return useQuery({
    queryKey: queryKeys.beds.list(filters),
    enabled,
    queryFn: () => bedsApi.listBeds(token, filters),
  });
}
