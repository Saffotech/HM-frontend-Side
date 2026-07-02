import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  activateStaff,
  assignRolePermissions,
  createDepartment,
  createPermission,
  createRole,
  deleteStaff,
  getAdminDashboard,
  getDepartmentById,
  getReportsOverview,
  getReportsVisits,
  getStaffById,
  listDepartments,
  listRoles,
  listStaff,
  registerStaff,
  updateDepartment,
  updateStaff,
} from '@/features/admin/api/admin';
import { loadPermissionCatalog } from '@/features/admin/utils/permissionCatalog';
import { queryKeys } from '@/shared/api/queryKeys';

export function useAdminDashboardQuery(options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.admin.dashboard,
    enabled,
    queryFn: () => getAdminDashboard(),
  });
}

export function useAdminStaffListQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.admin.staff(filters),
    enabled,
    queryFn: () => listStaff(filters),
  });
}

export function useAdminStaffDetailQuery(userId, options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.admin.staffDetail(userId),
    enabled: enabled && Boolean(userId),
    queryFn: () => getStaffById(userId),
  });
}

export function useAdminRolesQuery(options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.admin.roles,
    enabled,
    queryFn: () => listRoles(),
  });
}

export function useAdminDepartmentsQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.admin.departments(filters),
    enabled,
    queryFn: () => listDepartments(filters),
  });
}

export function useAdminDepartmentDetailQuery(departmentId, options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.admin.departmentDetail(departmentId),
    enabled: enabled && Boolean(departmentId),
    queryFn: () => getDepartmentById(departmentId),
  });
}

export function useAdminReportsOverviewQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.admin.reportsOverview(filters),
    enabled,
    queryFn: () => getReportsOverview(filters),
  });
}

export function useAdminReportsVisitsQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.admin.reportsVisits(filters),
    enabled,
    queryFn: () => getReportsVisits(filters),
  });
}

export function usePermissionCatalogQuery(options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.admin.permissionCatalog,
    enabled,
    queryFn: () => loadPermissionCatalog(),
    staleTime: 0,
  });
}

export function useCreateDepartmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => createDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
  });
}

export function useUpdateDepartmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateDepartment(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.departmentDetail(variables.id),
        });
      }
    },
  });
}

export function useCreateRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.roles });
    },
  });
}

export function useCreatePermissionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => createPermission(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.permissionCatalog });
    },
  });
}

export function useAssignRolePermissionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, permissionIds }) =>
      assignRolePermissions(roleId, permissionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.roles });
    },
  });
}

export function useUpdateStaffMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateStaff(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.staffDetail(variables.id),
        });
      }
    },
  });
}

export function useActivateStaffMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active: isActive }) => activateStaff(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
  });
}

export function useDeleteStaffMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => deleteStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
  });
}

export function useRegisterStaffMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data }) => registerStaff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
  });
}
