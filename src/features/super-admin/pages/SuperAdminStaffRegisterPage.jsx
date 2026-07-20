import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import SuperAdminLayout from '@/features/super-admin/components/SuperAdminLayout';
import {
  useAdminDepartmentsQuery,
  useAdminRolesQuery,
  useRegisterStaffMutation,
} from '@/shared/hooks/queries/useAdminQuery';
import { Button, Input, Label, QueryFeedback, Select } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
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
  if (name === 'super_admin') return 'Super Admin';
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function RegisterField({ id, label, required, children, className = '' }) {
  return (
    <div className={`sa-register-field ${className}`.trim()}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="sa-register-field__req" aria-hidden> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

export default function SuperAdminStaffRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);

  const rolesQuery = useAdminRolesQuery();
  const departmentsQuery = useAdminDepartmentsQuery();
  const registerMutation = useRegisterStaffMutation();

  const roles = rolesQuery.data;
  const departments = departmentsQuery.data;
  const rolesLoading = rolesQuery.isLoading;
  const rolesError = rolesQuery.isError;
  const departmentsLoading = departmentsQuery.isLoading;
  const departmentsError = departmentsQuery.isError;

  const selectedRole = roles?.find((r) => String(r.id) === String(form.role_id));
  // Department applies only to doctors (clinical specialty assignment)
  const departmentEnabled = selectedRole?.name === 'doctor';

  const roleOptions = useMemo(
    () =>
      roles?.map((role) => ({
        value: String(role.id),
        label: formatRoleLabel(role.name),
      })) ?? [],
    [roles],
  );

  const departmentOptions = useMemo(
    () =>
      departments?.map((dept) => ({
        value: String(dept.id),
        label: dept.name,
      })) ?? [],
    [departments],
  );

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleRoleChange = (value) => {
    const nextRole = roles?.find((r) => String(r.id) === String(value));
    setForm((prev) => ({
      ...prev,
      role_id: value,
      // Clear department when switching away from doctor
      department_id: nextRole?.name === 'doctor' ? prev.department_id : '',
    }));
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

    if (departmentEnabled && !form.department_id) {
      toast.error('Please select a department for doctor');
      return;
    }

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim() || null,
      email: form.email.trim(),
      password: form.password,
      role_id: Number(form.role_id),
      department_id:
        departmentEnabled && form.department_id ? Number(form.department_id) : null,
    };

    try {
      const result = await registerMutation.mutateAsync({ data: payload });
      toast.success(result?.message || 'Staff registered successfully');
      setForm(EMPTY_FORM);
      navigate(ROUTES.SUPER_ADMIN_STAFF);
    } catch (err) {
      const message =
        err?.status === 409
          ? 'Email already registered'
          : err?.message || 'Failed to register staff';
      toast.error(message);
    }
  };

  return (
    <SuperAdminLayout pageTitle="Register Staff" compact>
      <div className="admin-page sa-register-page">
        <div className="sa-register-shell admin-card sa-panel-card">
          <header className="sa-register-shell__toolbar">
            <Button
              type="button"
              variant="ghost"
              className="sa-register-back"
              onClick={() => navigate(ROUTES.SUPER_ADMIN_STAFF)}
            >
              <ArrowLeft size={16} aria-hidden />
              Back
            </Button>
            <div className="sa-register-shell__title-wrap">
              <span className="sa-register-shell__icon" aria-hidden>
                <UserPlus size={18} strokeWidth={2} />
              </span>
              <div>
                <h1 className="sa-register-shell__title">New staff member</h1>
                <p className="sa-register-shell__desc">Register any hospital role</p>
              </div>
            </div>
          </header>

          {rolesError ? (
            <div className="sa-register-shell__body">
              <QueryFeedback isError error={rolesQuery.error} onRetry={rolesQuery.refetch} />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="sa-register-form">
              <div className="sa-register-shell__body">
                <div className="sa-register-grid">
                  <RegisterField id="sa_first_name" label="First name" required>
                    <Input
                      id="sa_first_name"
                      value={form.first_name}
                      onChange={handleChange('first_name')}
                      placeholder="Priya"
                      required
                    />
                  </RegisterField>
                  <RegisterField id="sa_last_name" label="Last name">
                    <Input
                      id="sa_last_name"
                      value={form.last_name}
                      onChange={handleChange('last_name')}
                      placeholder="Sharma"
                    />
                  </RegisterField>
                  <RegisterField id="sa_email" label="Email" required>
                    <Input
                      id="sa_email"
                      type="email"
                      value={form.email}
                      onChange={handleChange('email')}
                      placeholder="name@saffocare.local"
                      required
                    />
                  </RegisterField>
                  <RegisterField id="sa_password" label="Password" required>
                    <Input
                      id="sa_password"
                      type="password"
                      value={form.password}
                      onChange={handleChange('password')}
                      placeholder="Min. 8 characters"
                      minLength={8}
                      required
                    />
                  </RegisterField>
                  <RegisterField id="sa_role" label="Role" required>
                    <Select
                      value={form.role_id}
                      onChange={handleRoleChange}
                      options={roleOptions}
                      placeholder={rolesLoading ? 'Loading…' : 'Select role'}
                      disabled={rolesLoading || rolesError}
                    />
                  </RegisterField>
                  <RegisterField
                    id="sa_department"
                    label="Department"
                    required={departmentEnabled}
                  >
                    {departmentsError ? (
                      <p className="sa-register-field__error" role="alert">
                        {departmentsQuery.error?.message || 'Could not load departments'}
                      </p>
                    ) : null}
                    <Select
                      value={form.department_id}
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, department_id: value }))
                      }
                      options={departmentOptions}
                      placeholder={
                        !departmentEnabled
                          ? 'Only for doctor role'
                          : departmentsLoading
                            ? 'Loading…'
                            : 'Select department'
                      }
                      disabled={
                        !departmentEnabled || departmentsLoading || departmentsError
                      }
                    />
                  </RegisterField>
                </div>
              </div>

              <div className="sa-register-actions">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate(ROUTES.SUPER_ADMIN_STAFF)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    registerMutation.isPending ||
                    rolesLoading ||
                    rolesError ||
                    !roleOptions.length
                  }
                >
                  <UserPlus size={16} aria-hidden />
                  {registerMutation.isPending ? 'Registering…' : 'Register staff'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
