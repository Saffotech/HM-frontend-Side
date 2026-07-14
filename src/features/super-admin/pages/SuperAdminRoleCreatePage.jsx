import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldPlus } from 'lucide-react';
import SuperAdminLayout from '@/features/super-admin/components/SuperAdminLayout';
import AdminBackBar from '@/features/admin/components/AdminBackBar';
import { useCreateRoleMutation } from '@/shared/hooks/queries/useAdminQuery';
import { Button, Input, Label } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';

export default function SuperAdminRoleCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', description: '' });
  const createMutation = useCreateRoleMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error('Role name is required');
      return;
    }
    try {
      const result = await createMutation.mutateAsync({
        name,
        description: form.description.trim() || null,
      });
      toast.success(result?.message || 'Role created');
      const roleId = result?.id ?? result?.role_id;
      if (roleId) {
        navigate(`/super-admin/roles/${roleId}/permissions`);
      } else {
        navigate(ROUTES.SUPER_ADMIN_ROLES);
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to create role');
    }
  };

  return (
    <SuperAdminLayout pageTitle="Create Role">
      <div className="admin-page">
        <AdminBackBar onBack={() => navigate(ROUTES.SUPER_ADMIN_ROLES)} />
        <div className="admin-card admin-card--narrow">
          <div className="admin-card__header">
            <h2 className="admin-card__title">New role</h2>
            <p className="admin-card__desc">After creating, assign permissions on the next screen.</p>
          </div>
          <div className="admin-card__body">
            <form onSubmit={handleSubmit} className="admin-form-grid">
              <div>
                <Label htmlFor="sa_role_name">Role name *</Label>
                <Input
                  id="sa_role_name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. head_nurse"
                  required
                />
              </div>
              <div>
                <Label htmlFor="sa_role_desc">Description</Label>
                <Input
                  id="sa_role_desc"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description"
                />
              </div>
              <div className="admin-form-actions">
                <Button type="submit" disabled={createMutation.isPending}>
                  <ShieldPlus size={16} aria-hidden />
                  {createMutation.isPending ? 'Creating…' : 'Create role'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
