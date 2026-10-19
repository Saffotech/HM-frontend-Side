import { useAuth } from '@/shared/hooks/useAuth';
import { hasBackendPermission } from '@/hooks/permissions';

const PERMS = {
  view: 'bed_allocation:view',
  create: 'bed_allocation:create',
  update: 'bed_allocation:update',
  delete: 'bed_allocation:delete',
  assign: 'bed_allocation:assign',
};

export function useAdminBedAllocationPermissions() {
  const { user } = useAuth();
  return {
    canView: hasBackendPermission(user, PERMS.view),
    canCreate: hasBackendPermission(user, PERMS.create),
    canUpdate: hasBackendPermission(user, PERMS.update),
    canDelete: hasBackendPermission(user, PERMS.delete),
    canAssign: hasBackendPermission(user, PERMS.assign),
  };
}
