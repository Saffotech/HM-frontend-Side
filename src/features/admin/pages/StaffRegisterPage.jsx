import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminBackBar from '@/features/admin/components/AdminBackBar';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader';
import {
  useAdminDepartmentsQuery,
  useAdminRolesQuery,
  useRegisterStaffMutation,
} from '@/shared/hooks/queries/useAdminQuery';
import { Button, Input, Label, QueryFeedback, Select } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { filterHospitalAdminRegisterRoles } from '@/features/admin/utils/hospitalAdminRoles';
import { toast } from '@/shared/utils/toast';

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  role_id: '',
  department_id: '',
};

function formatRoleLabel(name) {
  if (!name) return '—';
  if (name === 'opd_billing') return 'OPD Billing';
  if (name === 'lab_technician') return 'Lab Technician';
  if (name === 'receptionist') return 'Receptionist';
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StaffRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);

  const {
    data: roles,
    isLoading: rolesLoading,
    isError: rolesError,
    error: rolesQueryError,
    refetch: refetchRoles,
  } = useAdminRolesQuery();
  const {
    data: departments,
    isLoading: departmentsLoading,
    isError: departmentsError,
    error: departmentsQueryError,
    refetch: refetchDepartments,
  } = useAdminDepartmentsQuery();
  const registerMutation = useRegisterStaffMutation();

  const selectedRole = roles?.find((r) => String(r.id) === String(form.role_id));
  const needsDepartment =
    selectedRole?.name === 'doctor' || selectedRole?.name === 'nurse';

  const roleOptions = useMemo(
    () =>
      filterHospitalAdminRegisterRoles(roles)?.map((role) => ({
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

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.first_name.trim() || !form.email.trim() || !form.password || !form.role_id) {
      toast.error('Please fill all required fields');
      return;
    }

    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim() || null,
      email: form.email.trim(),
      password: form.password,
      role_id: Number(form.role_id),
      department_id:
        needsDepartment && form.department_id ? Number(form.department_id) : null,
    };

    try {
      const result = await registerMutation.mutateAsync({ data: payload });
      toast.success(result?.message || 'Staff registered successfully');
      setForm(EMPTY_FORM);
      navigate(ROUTES.ADMIN_STAFF);
    } catch (err) {
      const message =
        err?.status === 409
          ? 'Email already registered'
          : err?.message || 'Failed to register staff';
      toast.error(message);
    }
  };

  return (
    <AdminLayout pageTitle="Register Staff">
      <div className="admin-page">
        <AdminBackBar onBack={() => navigate(ROUTES.ADMIN_STAFF)} />

        <AdminPageHeader
          title="Register new staff"
          subtitle="Create a staff account with role and optional department assignment."
        />

        <div className="admin-card admin-card--narrow">
          <div className="admin-card__header">
            <h2 className="admin-card__title">Account details</h2>
            <p className="admin-card__desc">
              Create a staff account. Fields match POST /auth/register on the backend.
            </p>
          </div>
          <div className="admin-card__body">
            {rolesError ? (
              <QueryFeedback
                isError
                error={rolesQueryError}
                onRetry={refetchRoles}
              />
            ) : (
            <form onSubmit={handleSubmit} className="admin-form-grid">
              <div className="admin-form-section">
                <h3 className="admin-form-section__title">Personal details</h3>
                <div className="admin-form-grid admin-form-grid--2">
                  <div>
                    <Label htmlFor="first_name">First name *</Label>
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
              </div>

              <div className="admin-form-section">
                <h3 className="admin-form-section__title">Account credentials</h3>
                <div className="admin-form-grid admin-form-grid--2">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange('email')}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Temporary password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={form.password}
                      onChange={handleChange('password')}
                      minLength={8}
                      required
                    />
                    <p className="admin-help-text">Minimum 8 characters.</p>
                  </div>
                </div>
              </div>

              <div className="admin-form-section">
                <h3 className="admin-form-section__title">Role assignment</h3>
                <div className="admin-form-grid admin-form-grid--2">
                  <Select
                    label="Role *"
                    value={form.role_id}
                    onChange={(value) => setForm((prev) => ({ ...prev, role_id: value }))}
                    options={roleOptions}
                    placeholder={rolesLoading ? 'Loading roles…' : 'Select role'}
                    disabled={rolesLoading || rolesError}
                  />
                  {needsDepartment && (
                    <div>
                      {departmentsError && (
                        <p className="field__error" role="alert">
                          {departmentsQueryError?.message || 'Could not load departments'}{' '}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => refetchDepartments()}
                          >
                            Retry
                          </Button>
                        </p>
                      )}
                      <Select
                        label="Department"
                        value={form.department_id}
                        onChange={(value) =>
                          setForm((prev) => ({ ...prev, department_id: value }))
                        }
                        options={departmentOptions}
                        placeholder={
                          departmentsLoading ? 'Loading departments…' : 'Select department'
                        }
                        disabled={departmentsLoading || departmentsError}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="admin-form-actions">
                <Button
                  type="submit"
                  disabled={
                    registerMutation.isPending ||
                    rolesLoading ||
                    rolesError ||
                    !roleOptions.length
                  }
                >
                  {registerMutation.isPending ? 'Registering…' : 'Register staff member'}
                  <UserPlus size={16} aria-hidden />
                </Button>
              </div>
            </form>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
