import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save } from 'lucide-react';
import SuperAdminLayout from '@/features/super-admin/components/SuperAdminLayout';
import AdminBackBar from '@/features/admin/components/AdminBackBar';
import DepartmentForm, {
  buildDepartmentPayload,
  emptyDepartmentForm,
} from '@/features/admin/components/DepartmentForm';
import { useCreateDepartmentMutation } from '@/shared/hooks/queries/useAdminQuery';
import { Button, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';

export default function SuperAdminDepartmentCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyDepartmentForm);
  const createMutation = useCreateDepartmentMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Department name is required');
      return;
    }

    try {
      const result = await createMutation.mutateAsync(buildDepartmentPayload(form));
      toast.success(result?.message || 'Department created successfully');
      const id = result?.department?.id;
      if (id) {
        navigate(ROUTES.SUPER_ADMIN_DEPARTMENT_DETAIL.replace(':id', id));
      } else {
        navigate(ROUTES.SUPER_ADMIN_DEPARTMENTS);
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to create department');
    }
  };

  return (
    <SuperAdminLayout pageTitle="New department">
      <div className="admin-page">
        <AdminBackBar onBack={() => navigate(ROUTES.SUPER_ADMIN_DEPARTMENTS)} />

        <div className="admin-card sa-panel-card admin-card--narrow">
          <div className="admin-card__header">
            <h2 className="admin-card__title">Create department</h2>
            <p className="admin-card__desc">Add a new department to the hospital directory.</p>
          </div>
          <div className="admin-card__body">
            <QueryFeedback isLoading={false} isError={false}>
              <form onSubmit={handleSubmit} className="admin-form-grid">
                <DepartmentForm form={form} onChange={setForm} idPrefix="sa-create" />
                <div className="admin-form-actions">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating…' : 'Create department'}
                    <Save size={16} aria-hidden />
                  </Button>
                </div>
              </form>
            </QueryFeedback>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
