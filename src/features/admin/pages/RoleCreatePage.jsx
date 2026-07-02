import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldPlus } from 'lucide-react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminBackBar from '@/features/admin/components/AdminBackBar';
import { useCreateRoleMutation } from '@/shared/hooks/queries/useAdminQuery';
import { Button, Input, Label, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';

const EMPTY_FORM = {
  name: '',
  description: '',
};

export default function RoleCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const createMutation = useCreateRoleMutation();

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

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
      toast.success(result?.message || 'Role created successfully');
      setForm(EMPTY_FORM);
      navigate(ROUTES.ADMIN_ROLES);
    } catch (err) {
      const message =
        err?.status === 409
          ? 'A role with this name already exists'
          : err?.message || 'Failed to create role';
      toast.error(message);
    }
  };

  return (
    <AdminLayout pageTitle="Create role">
      <div className="admin-page">
        <AdminBackBar onBack={() => navigate(ROUTES.ADMIN_ROLES)} />

        <div className="admin-card admin-card--narrow">
          <div className="admin-card__header">
            <h2 className="admin-card__title">New role</h2>
            <p className="admin-card__desc">
              Create a system role. Assign permissions after creation.
            </p>
          </div>
          <div className="admin-card__body">
            <QueryFeedback isLoading={false} isError={false}>
              <form onSubmit={handleSubmit} className="admin-form-grid">
                <div className="admin-form-section">
                  <h3 className="admin-form-section__title">Role details</h3>
                  <div>
                    <Label htmlFor="role_name">Role name *</Label>
                    <Input
                      id="role_name"
                      value={form.name}
                      onChange={handleChange('name')}
                      placeholder="e.g. ward_coordinator"
                      required
                    />
                    <p className="admin-help-text">Use lowercase with underscores for consistency.</p>
                  </div>
                  <div>
                    <Label htmlFor="role_description">Description</Label>
                    <Input
                      id="role_description"
                      value={form.description}
                      onChange={handleChange('description')}
                      placeholder="Optional description"
                    />
                  </div>
                </div>
                <div className="admin-form-actions">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating…' : 'Create role'}
                    <ShieldPlus size={16} aria-hidden />
                  </Button>
                </div>
              </form>
            </QueryFeedback>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
