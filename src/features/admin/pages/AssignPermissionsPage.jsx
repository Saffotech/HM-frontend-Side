import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminBackBar from '@/features/admin/components/AdminBackBar';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import { uniquePermissionNamesFromRoles } from '@/features/admin/utils/permissionCatalog';
import {
  useAdminRolesQuery,
  useAssignRolePermissionsMutation,
  usePermissionCatalogQuery,
} from '@/shared/hooks/queries/useAdminQuery';
import { Button, Input, Label, QueryFeedback, Select } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';

function parseExtraIds(raw) {
  return raw
    .split(/[,\s]+/)
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
}

export default function AssignPermissionsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRoleId = searchParams.get('role_id') || '';

  const [roleId, setRoleId] = useState(initialRoleId);
  const [selectedIds, setSelectedIds] = useState([]);
  const [extraIds, setExtraIds] = useState('');

  const { data: roles, isLoading, isError, error } = useAdminRolesQuery();
  const { data: catalog = [] } = usePermissionCatalogQuery();
  const assignMutation = useAssignRolePermissionsMutation();

  const roleOptions = useMemo(
    () =>
      roles?.map((role) => ({
        value: String(role.id),
        label: role.name,
      })) ?? [],
    [roles]
  );

  const selectedRole = roles?.find((role) => String(role.id) === String(roleId));
  const referenceNames = useMemo(
    () => uniquePermissionNamesFromRoles(roles),
    [roles]
  );

  useEffect(() => {
    if (initialRoleId) setRoleId(initialRoleId);
  }, [initialRoleId]);

  const togglePermission = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roleId) {
      toast.error('Select a role');
      return;
    }

    const permissionIds = [...new Set([...selectedIds, ...parseExtraIds(extraIds)])];
    if (!permissionIds.length) {
      toast.error('Select at least one permission');
      return;
    }

    try {
      const result = await assignMutation.mutateAsync({
        roleId: Number(roleId),
        permissionIds,
      });
      toast.success(result?.message || 'Permissions assigned successfully');
      navigate(ROUTES.ADMIN_ROLES);
    } catch (err) {
      toast.error(err?.message || 'Failed to assign permissions');
    }
  };

  return (
    <AdminLayout pageTitle="Assign permissions">
      <div className="admin-page">
        <AdminBackBar onBack={() => navigate(ROUTES.ADMIN_ROLES)} />

        <AdminPageHeader
          title="Assign permissions"
          subtitle="Select permission IDs to attach to a role. Saving replaces the role's current permission set."
        />

        <div className="admin-detail-grid">
          <div className="admin-card">
            <div className="admin-card__header">
              <h2 className="admin-card__title">Assign permissions to role</h2>
              <p className="admin-card__desc">
                Select permission IDs to assign. This replaces the role&apos;s current
                permission set on save.
              </p>
            </div>
            <div className="admin-card__body">
              <QueryFeedback isLoading={isLoading} isError={isError} error={error}>
                <form onSubmit={handleSubmit} className="admin-form-grid">
                  <Select
                    label="Role *"
                    value={roleId}
                    onChange={setRoleId}
                    options={roleOptions}
                    placeholder="Select role"
                  />

                  {selectedRole && (
                    <div className="admin-info-box">
                      <div className="admin-meta-list__label">Current permissions</div>
                      <div className="admin-perm-list">
                        {selectedRole.permissions?.length ? (
                          selectedRole.permissions.map((perm) => (
                            <span key={perm} className="admin-perm-badge">
                              {perm}
                            </span>
                          ))
                        ) : (
                          <span className="admin-help-text">No permissions assigned</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="admin-meta-list__label">Permission IDs</div>
                    {!catalog.length ? (
                      <p className="admin-help-text">
                        Create permissions first to populate selectable IDs, or enter IDs
                        manually below.
                      </p>
                    ) : (
                      <div className="admin-perm-checklist">
                        {catalog.map((item) => (
                          <label key={item.id} className="admin-checkbox-row">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(item.id)}
                              onChange={() => togglePermission(item.id)}
                            />
                            <span>
                              <strong>#{item.id}</strong> — {item.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="extra_ids">Additional permission IDs</Label>
                    <Input
                      id="extra_ids"
                      value={extraIds}
                      onChange={(e) => setExtraIds(e.target.value)}
                      placeholder="e.g. 1, 2, 5"
                    />
                    <p className="admin-help-text">
                      Comma-separated IDs for permissions not in the local catalog.
                    </p>
                  </div>

                  <div className="admin-form-actions">
                    <Button type="submit" disabled={assignMutation.isPending || !roleOptions.length}>
                      {assignMutation.isPending ? 'Saving…' : 'Save permissions'}
                      <Save size={16} aria-hidden />
                    </Button>
                  </div>
                </form>
              </QueryFeedback>
            </div>
          </div>

          <div className="admin-card">
            <div className="admin-card__header">
              <h2 className="admin-card__title">Permission name reference</h2>
              <p className="admin-card__desc">
                Names currently used across roles (IDs not exposed by GET /roles/).
              </p>
            </div>
            <div className="admin-card__body">
              {!referenceNames.length ? (
                <AdminEmptyState
                  title="No permission names found"
                  description="Permission names appear here once roles have assigned permissions."
                />
              ) : (
                <div className="admin-perm-list">
                  {referenceNames.map((name) => (
                    <span key={name} className="admin-perm-badge">
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
