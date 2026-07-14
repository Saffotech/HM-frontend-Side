import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Mail, Pencil, Save, User, X } from 'lucide-react';
import SuperAdminLayout from '@/features/super-admin/components/SuperAdminLayout';
import AdminBackBar from '@/features/admin/components/AdminBackBar';
import AdminStaffStatusBadge from '@/features/admin/components/AdminStaffStatusBadge';
import DepartmentForm, {
  buildDepartmentPayload,
  departmentToForm,
} from '@/features/admin/components/DepartmentForm';
import { useDepartmentDoctorsData } from '@/features/super-admin/hooks/useDepartmentDoctors';
import {
  filterDoctorsByDepartment,
  staffDisplayName,
} from '@/features/super-admin/utils/departmentDoctors';
import {
  useAdminDepartmentDetailQuery,
  useUpdateDepartmentMutation,
} from '@/shared/hooks/queries/useAdminQuery';
import { Button, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';

export default function SuperAdminDepartmentDetailPage() {
  const { id } = useParams();
  const departmentId = Number(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEdit = searchParams.get('edit') === '1' || searchParams.get('edit') === 'true';

  const [isEditing, setIsEditing] = useState(initialEdit);
  const [form, setForm] = useState(departmentToForm(null));

  const { data: department, isLoading, isError, error, refetch } = useAdminDepartmentDetailQuery(
    departmentId,
    { enabled: Number.isFinite(departmentId) && departmentId > 0 },
  );
  const {
    doctors,
    isLoading: doctorsLoading,
    isError: doctorsError,
    error: doctorsErrorObj,
    refetch: refetchDoctors,
  } = useDepartmentDoctorsData();
  const updateMutation = useUpdateDepartmentMutation();

  const departmentDoctors = useMemo(
    () => filterDoctorsByDepartment(doctors, departmentId),
    [doctors, departmentId],
  );

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
      <SuperAdminLayout pageTitle="Department">
        <div className="admin-alert">
          <p className="admin-alert__title">Invalid department ID</p>
        </div>
      </SuperAdminLayout>
    );
  }

  const pageLoading = isLoading || doctorsLoading;
  const pageError = isError || doctorsError;
  const pageErrorObj = error || doctorsErrorObj;

  return (
    <SuperAdminLayout pageTitle={department?.name || 'Department'}>
      <div className="admin-page sa-dept-detail-page">
        <AdminBackBar onBack={() => navigate(ROUTES.SUPER_ADMIN_DEPARTMENTS)}>
          {!pageLoading && department && !isEditing && (
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

        <QueryFeedback
          isLoading={pageLoading}
          isError={pageError}
          error={pageErrorObj}
          onRetry={() => {
            refetch();
            refetchDoctors();
          }}
        >
          {department && (
            <div className="sa-dept-detail__grid">
              <div className="admin-card sa-panel-card">
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
                        hideDescription
                        idPrefix="sa-detail"
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
                        <div className="admin-meta-list__label">Doctors assigned</div>
                        <div className="admin-meta-list__value">{departmentDoctors.length}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="admin-card sa-panel-card">
                <div className="admin-card__header">
                  <h2 className="admin-card__title">Doctors in this department</h2>
                  <p className="admin-card__desc">
                    Staff with the Doctor role assigned to {department.name}.
                  </p>
                </div>
                <div className="admin-card__body">
                  {!departmentDoctors.length ? (
                    <div className="admin-empty-state sa-dept-detail__empty-doctors">
                      <User size={22} aria-hidden />
                      <p>No doctors are assigned to this department yet.</p>
                    </div>
                  ) : (
                    <div className="admin-table-wrap">
                      <table className="admin-table sa-dept-detail__doctors-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {departmentDoctors.map((doctor) => (
                            <tr key={doctor.id}>
                              <td className="admin-table__primary">
                                {staffDisplayName(doctor)}
                              </td>
                              <td>
                                <a
                                  href={`mailto:${doctor.email}`}
                                  className="sa-dept-detail__doctor-email"
                                >
                                  <Mail size={14} aria-hidden />
                                  {doctor.email}
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </QueryFeedback>
      </div>
    </SuperAdminLayout>
  );
}
