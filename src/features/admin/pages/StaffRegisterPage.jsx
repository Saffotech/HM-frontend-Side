import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import {
  useAdminDepartmentsQuery,
  useAdminRolesQuery,
  useRegisterStaffMutation,
} from '@/shared/hooks/queries/useAdminQuery';
import { Button, Input, Label, Select } from '@/shared/components/common';
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
  if (name === 'opd_billing') return 'OPD Billing';
  return name || '—';
}

export default function StaffRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: roles } = useAdminRolesQuery();
  const { data: departments } = useAdminDepartmentsQuery();
  const registerMutation = useRegisterStaffMutation();

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
      await registerMutation.mutateAsync({ data: payload });
      toast.success('Staff registered successfully');
      navigate(ROUTES.ADMIN_STAFF);
    } catch (err) {
      toast.error(err?.message || 'Failed to register staff');
    }
  };

  return (
    <AdminLayout pageTitle="Register Staff">
      <div className="admin-page">
        <div className="admin-back-row">
          <Button variant="ghost" onClick={() => navigate(ROUTES.ADMIN_STAFF)}>
            <ArrowLeft size={16} aria-hidden />
            Back
          </Button>
          <h1 className="admin-page__title">Register new staff</h1>
        </div>

        <div className="admin-card" style={{ maxWidth: '48rem' }}>
          <div className="admin-card__header">
            <h2 className="admin-card__title">Account details</h2>
            <p className="admin-card__desc">
              Create a staff account. Fields match POST /auth/register on the backend.
            </p>
          </div>
          <div className="admin-card__body">
            <form onSubmit={handleSubmit} className="admin-form-grid">
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
                </div>
              </div>

              <div className="admin-form-grid admin-form-grid--2">
                <Select
                  label="Role *"
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
                <Button type="submit" disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? 'Registering…' : 'Register staff member'}
                  <UserPlus size={16} aria-hidden />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
