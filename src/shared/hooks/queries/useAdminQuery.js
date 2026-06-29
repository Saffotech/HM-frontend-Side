import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  activateStaff,
  deleteStaff,
  getAdminDashboard,
  getStaffById,
  listDepartments,
  listRoles,
  listStaff,
  registerStaff,
  updateStaff,
} from '@/features/admin/api/admin';
import { queryKeys } from '@/shared/api/queryKeys';
import { useAuth } from '@/shared/hooks/useAuth';

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

export function useAdminDepartmentsQuery(options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.admin.departments,
    enabled,
    queryFn: () => listDepartments(),
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active: isActive }) =>
      activateStaff(id, isActive, user?.user_id ?? user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
  });
}

export function useDeleteStaffMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => deleteStaff(id, user?.user_id ?? user?.id),
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
