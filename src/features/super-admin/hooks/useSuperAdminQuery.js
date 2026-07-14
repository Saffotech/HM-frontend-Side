import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getHospitalSettings,
  listAuditLogs,
  updateHospitalSettings,
} from '@/features/super-admin/api/superAdmin';
import { mapAuditResponse } from '@/features/super-admin/utils/auditMapper';
import {
  settingsApiToForm,
  settingsFormToApi,
} from '@/features/super-admin/utils/hospitalSettingsMapper';
import { loadSuperAdminPermissionCatalog } from '@/features/super-admin/utils/superAdminPermissionCatalog';

const superAdminKeys = {
  all: ['super-admin'],
  settings: ['super-admin', 'settings'],
  audit: (filters) => ['super-admin', 'audit', filters],
  permissionCatalog: ['super-admin', 'permission-catalog'],
};

export function useSuperAdminSettingsQuery(options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: superAdminKeys.settings,
    enabled,
    queryFn: async () => {
      const data = await getHospitalSettings();
      return settingsApiToForm(data);
    },
  });
}

export function useUpdateSuperAdminSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (form) => {
      const payload = settingsFormToApi(form);
      const data = await updateHospitalSettings(payload);
      return settingsApiToForm(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: superAdminKeys.settings });
    },
  });
}

export function useSuperAdminAuditQuery(filters = {}, options = {}) {
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

export function useSuperAdminPermissionCatalogQuery(options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: superAdminKeys.permissionCatalog,
    enabled,
    queryFn: () => loadSuperAdminPermissionCatalog(),
    staleTime: 0,
  });
}
