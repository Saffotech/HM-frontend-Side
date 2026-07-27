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
import {
  bulkCreateBedAllocations,
  createBedAllocation,
  deactivateBedAllocation,
  deleteBedAllocation,
  getBedAllocation,
  listBedAllocations,
  updateBedAllocation,
} from '@/shared/api/services/adminBedAllocation';
import {
  createWorkforceRoster,
  bulkCreateWorkforceRoster,
  createWorkforceShift,
  deleteWorkforceRoster,
  deleteWorkforceShift,
  getWorkforceDashboard,
  listWorkforceRoster,
  listWorkforceShifts,
  updateWorkforceShift,
} from '@/shared/api/services/adminNurseWorkforce';
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

/* —— Nurse bed allocation (Phase 3 Admin UI) —— */

export function useAdminBedAllocationsQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.admin.bedAllocations(filters),
    enabled,
    queryFn: () => listBedAllocations(filters),
  });
}

export function useAdminBedAllocationDetailQuery(allocationId, options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.admin.bedAllocationDetail(allocationId),
    enabled: enabled && Boolean(allocationId),
    queryFn: () => getBedAllocation(allocationId),
  });
}

function invalidateBedAllocations(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['admin', 'bed-allocations'] });
}

export function useCreateBedAllocationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (form) => createBedAllocation(form),
    onSuccess: () => invalidateBedAllocations(queryClient),
  });
}

export function useBulkCreateBedAllocationsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (form) => bulkCreateBedAllocations(form),
    onSuccess: () => invalidateBedAllocations(queryClient),
  });
}

export function useUpdateBedAllocationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, form }) => updateBedAllocation(id, form),
    onSuccess: (_data, vars) => {
      invalidateBedAllocations(queryClient);
      if (vars?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.bedAllocationDetail(vars.id),
        });
      }
    },
  });
}

export function useDeactivateBedAllocationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deactivateBedAllocation(id),
    onSuccess: () => invalidateBedAllocations(queryClient),
  });
}

export function useDeleteBedAllocationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteBedAllocation(id),
    onSuccess: () => invalidateBedAllocations(queryClient),
  });
}

/* —— Nurse Workforce (Phase 7) —— */

function invalidateWorkforce(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['admin', 'workforce'] });
}

export function useWorkforceDashboardQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.admin.workforceDashboard(filters),
    enabled,
    queryFn: () => getWorkforceDashboard(filters),
    staleTime: 30 * 1000,
  });
}

export function useWorkforceShiftsQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.admin.workforceShifts(filters),
    enabled,
    queryFn: () => listWorkforceShifts(filters),
  });
}

export function useWorkforceRosterQuery(filters = {}, options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.admin.workforceRoster(filters),
    enabled,
    queryFn: () => listWorkforceRoster(filters),
  });
}

export function useCreateWorkforceShiftMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => createWorkforceShift(body),
    onSuccess: () => invalidateWorkforce(queryClient),
  });
}

export function useUpdateWorkforceShiftMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => updateWorkforceShift(id, body),
    onSuccess: () => invalidateWorkforce(queryClient),
  });
}

export function useDeleteWorkforceShiftMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteWorkforceShift(id),
    onSuccess: () => invalidateWorkforce(queryClient),
  });
}

export function useCreateWorkforceRosterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => createWorkforceRoster(body),
    onSuccess: () => invalidateWorkforce(queryClient),
  });
}

export function useBulkCreateWorkforceRosterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => bulkCreateWorkforceRoster(body),
    onSuccess: () => invalidateWorkforce(queryClient),
  });
}

export function useDeleteWorkforceRosterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteWorkforceRoster(id),
    onSuccess: () => invalidateWorkforce(queryClient),
  });
}

