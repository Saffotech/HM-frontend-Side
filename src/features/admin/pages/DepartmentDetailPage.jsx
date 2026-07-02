import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Pencil, Save, X } from 'lucide-react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminBackBar from '@/features/admin/components/AdminBackBar';
import AdminStaffStatusBadge from '@/features/admin/components/AdminStaffStatusBadge';
import DepartmentForm, {
  buildDepartmentPayload,
  departmentToForm,
} from '@/features/admin/components/DepartmentForm';
import {
  useAdminDepartmentDetailQuery,
  useUpdateDepartmentMutation,
} from '@/shared/hooks/queries/useAdminQuery';
import { Button, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';

export default function DepartmentDetailPage() {
  const { id } = useParams();
  const departmentId = Number(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEdit = searchParams.get('edit') === '1' || searchParams.get('edit') === 'true';

  const [isEditing, setIsEditing] = useState(initialEdit);
  const [form, setForm] = useState(departmentToForm(null));

  const { data: department, isLoading, isError, error } = useAdminDepartmentDetailQuery(
    departmentId,
    { enabled: Number.isFinite(departmentId) && departmentId > 0 }
  );
  const updateMutation = useUpdateDepartmentMutation();

  useEffect(() => {
    if (!department || isEditing) return;
    setForm(departmentToForm(department));
  }, [department, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!department) return;
    if (!form.name.trim()) {
      toast.error('Department name is required');
      return;
    }

    try {
      const result = await updateMutation.mutateAsync({
        id: departmentId,
        data: buildDepartmentPayload(form, { includeStatus: true }),
      });
      toast.success(result?.message || 'Department updated successfully');
      setIsEditing(false);
    } catch (err) {
      toast.error(err?.message || 'Failed to update department');
    }
  };

  if (!Number.isFinite(departmentId) || departmentId <= 0) {
    return (
      <AdminLayout pageTitle="Department">
        <div className="admin-alert">
          <p className="admin-alert__title">Invalid department ID</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle={department?.name || 'Department'}>
      <div className="admin-page">
        <AdminBackBar onBack={() => navigate(ROUTES.ADMIN_DEPARTMENTS)}>
          {!isLoading && department && !isEditing && (
            <Button onClick={() => setIsEditing(true)}>
              <Pencil size={16} aria-hidden />
              Edit department
            </Button>
          )}
          {isEditing && (
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setForm(departmentToForm(department));
              }}
            >
              <X size={16} aria-hidden />
              Cancel
            </Button>
          )}
        </AdminBackBar>

        <QueryFeedback isLoading={isLoading} isError={isError} error={error}>
          {department && (
            <div className="admin-card">
              <div className="admin-card__header">
                <h2 className="admin-card__title">Department details</h2>
                <p className="admin-card__desc">Core information for this hospital unit.</p>
              </div>
              <div className="admin-card__body">
                {isEditing ? (
                  <form onSubmit={handleSubmit} className="admin-form-grid">
                    <DepartmentForm
                      form={form}
                      onChange={setForm}
                      showStatus
                      idPrefix="detail"
                    />
                    <div className="admin-form-actions">
                      <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? 'Saving…' : 'Save changes'}
                        <Save size={16} aria-hidden />
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="admin-form-grid admin-form-grid--2">
                    <div className="admin-meta-item">
                      <div className="admin-meta-list__label">Name</div>
                      <div className="admin-meta-list__value">{department.name}</div>
                    </div>
                    <div className="admin-meta-item">
                      <div className="admin-meta-list__label">Code</div>
                      <div className="admin-meta-list__value">{department.code || '—'}</div>
                    </div>
                    <div className="admin-meta-item">
                      <div className="admin-meta-list__label">Status</div>
                      <div className="admin-meta-list__value">
                        <AdminStaffStatusBadge isActive={department.is_active} />
                      </div>
                    </div>
                    <div className="admin-meta-item">
                      <div className="admin-meta-list__label">Department ID</div>
                      <div className="admin-meta-list__value">#{department.id}</div>
                    </div>
                    <div className="admin-meta-item admin-meta-item--full">
                      <div className="admin-meta-list__label">Description</div>
                      <div className="admin-meta-list__value">
                        {department.description || 'No description provided'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </QueryFeedback>
      </div>
    </AdminLayout>
  );
}
