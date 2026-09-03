import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Save } from 'lucide-react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import DepartmentForm, {
  buildDepartmentPayload,
  emptyDepartmentForm,
} from '@/features/admin/components/DepartmentForm';
import { useCreateDepartmentMutation } from '@/shared/hooks/queries/useAdminQuery';
import { Button } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { isLabOrRadCode } from '@/shared/utils/labDepartments';
import { toast } from '@/shared/utils/toast';

export default function DepartmentCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => emptyDepartmentForm());
  const createMutation = useCreateDepartmentMutation();

  useEffect(() => {
    setForm(emptyDepartmentForm());
  }, []);
  const listRoute = ROUTES.ADMIN_DEPARTMENTS;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Department name is required');
      return;
    }
    if (form.kind !== 'lab' && isLabOrRadCode(form.code)) {
      toast.error('Choose Lab department for Laboratory or Radiology');
      return;
    }

    try {
      const result = await createMutation.mutateAsync(buildDepartmentPayload(form));
      toast.success(result?.message || 'Department created successfully');
      const id = result?.department?.id;
      if (id) {
        navigate(ROUTES.ADMIN_DEPARTMENT_DETAIL.replace(':id', id));
      } else {
        navigate(listRoute);
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to create department');
    }
  };

  return (
    <AdminLayout compact>
      <div className="admin-page dept-create-page">
        <div className="admin-card dept-create-shell">
          <header className="dept-create-shell__toolbar">
            <Button
              type="button"
              variant="ghost"
              className="dept-create-back"
              onClick={() => navigate(listRoute)}
            >
              <ArrowLeft size={16} aria-hidden />
              Back
            </Button>
            <div className="dept-create-shell__title-wrap">
              <span className="dept-create-shell__icon" aria-hidden>
                <Building2 size={20} strokeWidth={2} />
              </span>
              <div>
                <h1 className="dept-create-shell__title">Create department</h1>
              </div>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="dept-create-form" autoComplete="off">
            <div className="dept-create-shell__body">
              <DepartmentForm
                form={form}
                onChange={setForm}
                showKind
                hideDescription
                idPrefix="new-dept"
              />
            </div>
            <div className="dept-create-actions">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate(listRoute)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                <Save size={16} aria-hidden />
                {createMutation.isPending ? 'Creating…' : 'Create department'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
