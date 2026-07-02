import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Link2 } from 'lucide-react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminBackBar from '@/features/admin/components/AdminBackBar';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import { addPermissionToCatalog } from '@/features/admin/utils/permissionCatalog';
import {
  useCreatePermissionMutation,
  usePermissionCatalogQuery,
} from '@/shared/hooks/queries/useAdminQuery';
import { Button, Input, Label, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/queryKeys';

const EMPTY_FORM = {
  name: '',
  description: '',
};

export default function PermissionCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState(null);
  const createMutation = useCreatePermissionMutation();
  const { data: catalog = [] } = usePermissionCatalogQuery();

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error('Permission name is required');
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        name,
        description: form.description.trim() || null,
      });
      const permissionId = result?.permission_id;
      if (permissionId) {
        addPermissionToCatalog({ id: permissionId, name });
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.permissionCatalog });
        setLastCreated({ id: permissionId, name });
      }
      toast.success(result?.message || 'Permission created successfully');
      setForm(EMPTY_FORM);
    } catch (err) {
      toast.error(err?.message || 'Failed to create permission');
    }
  };

  return (
    <AdminLayout pageTitle="Create permission">
      <div className="admin-page">
        <AdminBackBar onBack={() => navigate(ROUTES.ADMIN_ROLES)}>
          <Button variant="outline" onClick={() => navigate(ROUTES.ADMIN_ROLES_ASSIGN)}>
            <Link2 size={16} aria-hidden />
            Assign permissions
          </Button>
        </AdminBackBar>

        <AdminPageHeader
          title="Create permission"
          subtitle="Define a new permission string for role-based access control."
        />

        <div className="admin-detail-grid">
          <div className="admin-card">
            <div className="admin-card__header">
              <h2 className="admin-card__title">New permission</h2>
              <p className="admin-card__desc">
                Create a permission string (e.g. <code>patients:view</code>).
              </p>
            </div>
            <div className="admin-card__body">
              <form onSubmit={handleSubmit} className="admin-form-grid">
                <div>
                  <Label htmlFor="perm_name">Permission name *</Label>
                  <Input
                    id="perm_name"
                    value={form.name}
                    onChange={handleChange('name')}
                    placeholder="module:action"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="perm_description">Description</Label>
                  <Input
                    id="perm_description"
                    value={form.description}
                    onChange={handleChange('description')}
                    placeholder="Optional description"
                  />
                </div>
                <div className="admin-form-actions">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating…' : 'Create permission'}
                    <KeyRound size={16} aria-hidden />
                  </Button>
                </div>
              </form>

              {lastCreated && (
                <div className="admin-info-box">
                  <strong>Permission ID:</strong> {lastCreated.id}
                  <span className="admin-info-box__hint">
                    Use this ID when assigning permissions to a role.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="admin-card">
            <div className="admin-card__header">
              <h2 className="admin-card__title">Known permission IDs</h2>
              <p className="admin-card__desc">
                IDs from permissions created in this browser session.
              </p>
            </div>
            <div className="admin-card__body">
              <QueryFeedback isLoading={false} isError={false}>
                {!catalog.length ? (
                  <AdminEmptyState
                    title="No stored permission IDs"
                    description="Create a permission to capture its ID for assignment."
                  />
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catalog.map((item) => (
                          <tr key={item.id}>
                            <td>{item.id}</td>
                            <td>
                              <span className="admin-perm-badge">{item.name}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </QueryFeedback>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
