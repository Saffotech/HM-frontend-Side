import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import SuperAdminLayout from '@/features/super-admin/components/SuperAdminLayout';
import SuperAdminPermissionPicker from '@/features/super-admin/components/SuperAdminPermissionPicker';
import AdminBackBar from '@/features/admin/components/AdminBackBar';
import {
  useAdminRolesQuery,
  useAssignRolePermissionsMutation,
  usePermissionCatalogQuery,
} from '@/shared/hooks/queries/useAdminQuery';
import { Button, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';
import { useSuperAdminDemoMode } from '@/features/super-admin/hooks/useSuperAdminDemoMode';
import { formatRoleLabel } from '@/features/super-admin/utils/permissionPresentation';
import {
  MOCK_SUPER_ADMIN_PERMISSIONS,
  MOCK_SUPER_ADMIN_ROLES,
} from '@/features/super-admin/mock/superAdminMockData';

export default function SuperAdminAssignPermissionsPage() {
  const { roleId } = useParams();
  const navigate = useNavigate();
  const isDemo = useSuperAdminDemoMode();
  const [selectedIds, setSelectedIds] = useState([]);

  const apiRolesQuery = useAdminRolesQuery({ enabled: !isDemo });
  const apiCatalogQuery = usePermissionCatalogQuery({ enabled: !isDemo });
  const assignMutation = useAssignRolePermissionsMutation();

  const roles = isDemo ? MOCK_SUPER_ADMIN_ROLES : apiRolesQuery.data;
  const catalog = isDemo ? MOCK_SUPER_ADMIN_PERMISSIONS : (apiCatalogQuery.data ?? []);
  const isLoading = isDemo ? false : apiRolesQuery.isLoading;
  const isError = isDemo ? false : apiRolesQuery.isError;
  const error = isDemo ? null : apiRolesQuery.error;

  const selectedRole = roles?.find((role) => String(role.id) === String(roleId));
  const totalPermissions = catalog.length;

  useEffect(() => {
    if (!selectedRole?.permissions?.length) return;
    const ids = catalog
      .filter((p) => selectedRole.permissions.includes(p.name))
      .map((p) => p.id);
    setSelectedIds(ids);
  }, [selectedRole, catalog]);

  const togglePermission = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleGroup = (groupIds, selectAll) => {
    setSelectedIds((prev) => {
      if (!selectAll) {
        return prev.filter((id) => !groupIds.includes(id));
      }
      const next = new Set(prev);
      groupIds.forEach((id) => next.add(id));
      return [...next];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIds.length) {
      toast.error('Select at least one permission for this role');
      return;
    }
    if (isDemo) {
      toast.success('Permission assignment saved locally in demo mode only');
      navigate(ROUTES.SUPER_ADMIN_ROLES);
      return;
    }
    try {
      const result = await assignMutation.mutateAsync({
        roleId: Number(roleId),
        permissionIds: selectedIds,
      });
      toast.success(result?.message || 'Permissions saved');
      navigate(ROUTES.SUPER_ADMIN_ROLES);
    } catch (err) {
      toast.error(err?.message || 'Failed to assign permissions');
    }
  };

  const summaryText = useMemo(() => {
    if (!totalPermissions) return 'No permissions available';
    return `${selectedIds.length} of ${totalPermissions} enabled`;
  }, [selectedIds.length, totalPermissions]);

  const roleLabel = formatRoleLabel(selectedRole?.name);

  return (
    <SuperAdminLayout pageTitle="Assign Permissions">
      <div className="admin-page sa-perm-page">
        <AdminBackBar onBack={() => navigate(ROUTES.SUPER_ADMIN_ROLES)} />

        <QueryFeedback isLoading={isLoading} isError={isError} error={error}>
          {!selectedRole ? (
            <div className="admin-card sa-panel-card">
              <div className="admin-empty-state">
                <p>Role not found. Choose a role from the list.</p>
                <Button variant="outline" onClick={() => navigate(ROUTES.SUPER_ADMIN_ROLES)}>
                  Back to roles
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="sa-perm-form">
              <div className="admin-card sa-panel-card sa-perm-card">
                <div className="sa-perm-card__toolbar">
                  <div className="sa-perm-card__intro">
                    <h1 className="sa-perm-card__title">Permissions for {roleLabel}</h1>
                    <p className="sa-perm-card__sub">{summaryText}</p>
                  </div>
                  <Button type="submit" disabled={assignMutation.isPending}>
                    <Save size={16} aria-hidden />
                    {assignMutation.isPending ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>

                <SuperAdminPermissionPicker
                  catalog={catalog}
                  selectedIds={selectedIds}
                  onToggle={togglePermission}
                  onToggleGroup={toggleGroup}
                />
              </div>
            </form>
          )}
        </QueryFeedback>
      </div>
    </SuperAdminLayout>
  );
}
