import { useQuery } from '@tanstack/react-query';
import { listAuditLogs } from '@/features/admin/api/admin';
import { mapAuditResponse } from '@/features/admin/utils/auditMapper';
import { loadAdminPermissionCatalog } from '@/features/admin/utils/adminPermissionCatalog';

const superAdminKeys = {
  all: ['super-admin'],
  audit: (filters) => ['super-admin', 'audit', filters],
  permissionCatalog: ['super-admin', 'permission-catalog'],
};

/* Legacy identifier preserved: useSuperAdminAuditQuery. Active name: useAdminAuditQuery. */
export function useAdminAuditQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: superAdminKeys.audit(filters),
    enabled,
    queryFn: async () => {
      const data = await listAuditLogs({
        search: filters.actor || filters.search,
        action: filters.action && filters.action !== 'all' ? filters.action : undefined,
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        page: filters.page ?? 1,
        limit: filters.limit ?? 20,
      });
      return mapAuditResponse(data);
    },
  });
}

/* Legacy identifier preserved: useSuperAdminPermissionCatalogQuery. Active name: useAdminPermissionCatalogQuery. */
export function useAdminPermissionCatalogQuery(options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: superAdminKeys.permissionCatalog,
    enabled,
    queryFn: () => loadAdminPermissionCatalog(),
    staleTime: 0,
  });
}
