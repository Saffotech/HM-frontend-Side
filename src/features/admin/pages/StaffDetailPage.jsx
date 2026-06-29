import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Pencil, Save, User, X } from 'lucide-react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminStaffStatusBadge from '@/features/admin/components/AdminStaffStatusBadge';
import {
  useAdminDepartmentsQuery,
  useAdminRolesQuery,
  useAdminStaffDetailQuery,
  useUpdateStaffMutation,
} from '@/shared/hooks/queries/useAdminQuery';
import { Button, Input, Label, QueryFeedback, Select } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatRoleLabel(name) {
  if (name === 'opd_billing') return 'OPD Billing';
  return name || '—';
}

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  phone: '',
  role_id: '',
  department_id: '',
};

export default function StaffDetailPage() {
  const { id } = useParams();
  const userId = Number(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEdit = searchParams.get('edit') === '1' || searchParams.get('edit') === 'true';

  const [isEditing, setIsEditing] = useState(initialEdit);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: staff, isLoading, isError, error } = useAdminStaffDetailQuery(userId, {
    enabled: Number.isFinite(userId) && userId > 0,
  });
  const { data: roles } = useAdminRolesQuery();
  const { data: departments } = useAdminDepartmentsQuery();
  const updateMutation = useUpdateStaffMutation();

  const selectedRole = roles?.find((r) => String(r.id) === String(form.role_id));
  const needsDepartment =
    selectedRole?.name === 'doctor' || selectedRole?.name === 'nurse';

  const roleOptions = useMemo(
    () =>
      roles?.map((role) => ({
        value: String(role.id),
        label: formatRoleLabel(role.name),
      })) ?? [],
    [roles]
  );

  const departmentOptions = useMemo(
    () =>
      departments?.map((dept) => ({
        value: String(dept.id),
        label: dept.name,
      })) ?? [],
    [departments]
  );

  useEffect(() => {
    if (!staff || isEditing) return;
    setForm({
      first_name: staff.first_name ?? '',
      last_name: staff.last_name ?? '',
      phone: staff.phone ?? '',
      role_id: staff.role_id ? String(staff.role_id) : '',
      department_id: staff.department_id ? String(staff.department_id) : '',
    });
  }, [staff, isEditing]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!staff) return;

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim() || null,
      phone: form.phone.trim() || null,
      role_id: Number(form.role_id),
      department_id: needsDepartment && form.department_id ? Number(form.department_id) : null,
    };

    try {
      await updateMutation.mutateAsync({ id: userId, data: payload });
      toast.success('Staff details updated successfully');
      setIsEditing(false);
    } catch (err) {
      toast.error(err?.message || 'Failed to update staff');
    }
  };

  if (!Number.isFinite(userId) || userId <= 0) {
    return (
      <AdminLayout pageTitle="Staff Details">
        <div className="admin-alert">
          <p className="admin-alert__title">Invalid staff ID</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      pageTitle={staff ? `${staff.first_name} ${staff.last_name || ''}`.trim() : 'Staff Details'}
    >
      <div className="admin-page">
        <div className="admin-back-row">
          <Button variant="ghost" onClick={() => navigate(ROUTES.ADMIN_STAFF)}>
            <ArrowLeft size={16} aria-hidden />
            Back
          </Button>
          {!isLoading && staff && !isEditing && (
            <Button onClick={() => setIsEditing(true)}>
              <Pencil size={16} aria-hidden />
              Edit profile
            </Button>
          )}
          {isEditing && (
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                if (staff) {
                  setForm({
                    first_name: staff.first_name ?? '',
                    last_name: staff.last_name ?? '',
                    phone: staff.phone ?? '',
                    role_id: staff.role_id ? String(staff.role_id) : '',
                    department_id: staff.department_id ? String(staff.department_id) : '',
                  });
                }
              }}
            >
              <X size={16} aria-hidden />
              Cancel
            </Button>
          )}
        </div>

        <QueryFeedback isLoading={isLoading} isError={isError} error={error}>
          {staff && (
            <div className="admin-detail-grid">
              <div className="admin-card">
                <div className="admin-card__header">
                  <h2 className="admin-card__title">Profile information</h2>
                </div>
                <div className="admin-card__body">
                  {isEditing ? (
                    <form onSubmit={handleSubmit} className="admin-form-grid">
                      <div className="admin-form-grid admin-form-grid--2">
                        <div>
                          <Label htmlFor="first_name">First name</Label>
                          <Input
                            id="first_name"
                            value={form.first_name}
                            onChange={handleChange('first_name')}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="last_name">Last name</Label>
                          <Input
                            id="last_name"
                            value={form.last_name}
                            onChange={handleChange('last_name')}
                          />
                        </div>
                      </div>

                      <div className="admin-form-grid admin-form-grid--2">
                        <div>
                          <Label htmlFor="email">Email (read-only)</Label>
                          <Input id="email" value={staff.email} disabled />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone</Label>
                          <Input id="phone" value={form.phone} onChange={handleChange('phone')} />
                        </div>
                      </div>

                      <div className="admin-form-grid admin-form-grid--2">
                        <Select
                          label="Role"
                          value={form.role_id}
                          onChange={(value) => setForm((prev) => ({ ...prev, role_id: value }))}
                          options={roleOptions}
                        />
                        {needsDepartment && (
                          <Select
                            label="Department"
                            value={form.department_id}
                            onChange={(value) =>
                              setForm((prev) => ({ ...prev, department_id: value }))
                            }
                            options={departmentOptions}
                          />
                        )}
                      </div>

                      <div className="admin-form-actions">
                        <Button type="submit" disabled={updateMutation.isPending}>
                          {updateMutation.isPending ? 'Saving…' : 'Save changes'}
                          <Save size={16} aria-hidden />
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="admin-meta-list">
                      <div className="admin-form-grid admin-form-grid--2">
                        <div>
                          <div className="admin-meta-list__label">Full name</div>
                          <div className="admin-meta-list__value">
                            {staff.first_name} {staff.last_name}
                          </div>
                        </div>
                        <div>
                          <div className="admin-meta-list__label">Email</div>
                          <div className="admin-meta-list__value">{staff.email}</div>
                        </div>
                        <div>
                          <div className="admin-meta-list__label">Phone</div>
                          <div className="admin-meta-list__value">{staff.phone || 'Not provided'}</div>
                        </div>
                        <div>
                          <div className="admin-meta-list__label">Role</div>
                          <div className="admin-meta-list__value admin-role-name">
                            {formatRoleLabel(staff.role_name)}
                          </div>
                        </div>
                        <div>
                          <div className="admin-meta-list__label">Department</div>
                          <div className="admin-meta-list__value">
                            {staff.department_name || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="admin-card">
                <div className="admin-card__header">
                  <h2 className="admin-card__title">Account status</h2>
                </div>
                <div className="admin-card__body admin-meta-list">
                  <div className="admin-meta-list__row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="admin-meta-list__label">Status</span>
                    <AdminStaffStatusBadge isActive={staff.is_active} />
                  </div>
                  <div className="admin-meta-list__row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="admin-meta-list__label">
                      <ActivityIcon />
                      Logins
                    </span>
                    <span className="admin-meta-list__value">{staff.login_count ?? 0}</span>
                  </div>
                  <div className="admin-meta-list__row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="admin-meta-list__label">
                      <Calendar size={14} style={{ marginRight: 4 }} aria-hidden />
                      Created
                    </span>
                    <span className="admin-meta-list__value">{formatDate(staff.created_at)}</span>
                  </div>
                  <div className="admin-meta-list__row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="admin-meta-list__label">
                      <User size={14} style={{ marginRight: 4 }} aria-hidden />
                      Last login
                    </span>
                    <span className="admin-meta-list__value">
                      {staff.last_login ? formatDate(staff.last_login) : 'Never'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </QueryFeedback>
      </div>
    </AdminLayout>
  );
}

function ActivityIcon() {
  return <span style={{ marginRight: 4 }} aria-hidden>↻</span>;
}
