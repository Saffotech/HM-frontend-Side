import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import SuperAdminLayout from '@/features/super-admin/components/SuperAdminLayout';
import SuperAdminPermissionPicker from '@/features/super-admin/components/SuperAdminPermissionPicker';
import AdminBackBar from '@/features/admin/components/AdminBackBar';
import {
  useAdminRolesQuery,
  useAssignRolePermissionsMutation,
} from '@/shared/hooks/queries/useAdminQuery';
import { useSuperAdminPermissionCatalogQuery } from '@/features/super-admin/hooks/useSuperAdminQuery';
import { Button, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';
import { formatRoleLabel } from '@/features/super-admin/utils/permissionPresentation';

export default function SuperAdminAssignPermissionsPage() {
  const { roleId } = useParams();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState([]);

  const apiRolesQuery = useAdminRolesQuery();
  const apiCatalogQuery = useSuperAdminPermissionCatalogQuery();
  const assignMutation = useAssignRolePermissionsMutation();

  const roles = apiRolesQuery.data;
  const catalog = apiCatalogQuery.data ?? [];
  const isLoading = apiRolesQuery.isLoading || apiCatalogQuery.isLoading;
  const isError = apiRolesQuery.isError || apiCatalogQuery.isError;
  const error = apiRolesQuery.error || apiCatalogQuery.error;

  const selectedRole = roles?.find((role) => String(role.id) === String(roleId));
  const assignableCatalog = useMemo(
    () => catalog.filter((p) => p.id != null && !p.unresolved),
    [catalog],
  );
  const totalPermissions = assignableCatalog.length;
  const rolePermissionKey = selectedRole?.permissions?.join('|') ?? '';
  const rolePermissionNames = useMemo(() => {
    if (!rolePermissionKey) return new Set();
    return new Set(rolePermissionKey.split('|'));
  }, [rolePermissionKey]);

  useEffect(() => {
    if (!rolePermissionNames.size || !assignableCatalog.length) return;
    const ids = assignableCatalog
      .filter((p) => rolePermissionNames.has(p.name))
      .map((p) => p.id);
    setSelectedIds((prev) => {
      if (prev.length === ids.length && prev.every((id, index) => id === ids[index])) {
        return prev;
      }
      return ids;
    });
  }, [rolePermissionNames, assignableCatalog]);

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
                  <Button type="submit" disabled={assignMutation.isPending || !totalPermissions}>
                    <Save size={16} aria-hidden />
                    {assignMutation.isPending ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>

                {!totalPermissions ? (
                  <p className="sa-settings-unsupported" role="note">
                    Permission catalog is unavailable. Re-run database seed or assign permissions via API.
                  </p>
                ) : (
                  <SuperAdminPermissionPicker
                    catalog={assignableCatalog}
                    selectedIds={selectedIds}
                    onToggle={togglePermission}
                    onToggleGroup={toggleGroup}
                  />
                )}
              </div>
            </form>
          )}
        </QueryFeedback>
      </div>
    </SuperAdminLayout>
  );
}
