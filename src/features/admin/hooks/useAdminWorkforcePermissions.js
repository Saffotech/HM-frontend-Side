import { useAuth } from '@/shared/hooks/useAuth';
import { hasBackendPermission } from '@/hooks/permissions';

const PERMS = {
  view: 'workforce:view',
  create: 'workforce:create',
  update: 'workforce:update',
  delete: 'workforce:delete',
  roster: 'roster:manage',
};

export function useAdminWorkforcePermissions() {
  const { user } = useAuth();
  return {
    canView: hasBackendPermission(user, PERMS.view),
    canCreate: hasBackendPermission(user, PERMS.create),
    canUpdate: hasBackendPermission(user, PERMS.update),
    canDelete: hasBackendPermission(user, PERMS.delete),
    canManageRoster: hasBackendPermission(user, PERMS.roster),
  };
}
