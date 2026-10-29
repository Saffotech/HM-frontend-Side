import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, Shield, User, UserPlus } from 'lucide-react';
import ManagerLayout from '@/features/manager/components/ManagerLayout';
import './StaffRegisterPage.css';
import {
  useAdminDepartmentsQuery,
  useAdminRolesQuery,
  useRegisterStaffMutation,
} from '@/shared/hooks/queries/useAdminQuery';
import { Button, Input, Label, QueryFeedback, Select } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { filterHospitalAdminRegisterRoles } from '@/features/manager/utils/hospitalManagerRoles';
import { toast } from '@/shared/utils/toast';
import { normalizeEmailInput } from '@/shared/utils/credentials';
import { ensureLabTechDepartmentId } from '@/features/manager/utils/ensureLabTechDepartment';
import {
  isLabTechnicianRole,
  resolveStaffDepartmentPayloadId,
  roleRequiresDepartment,
  staffDepartmentSelectOptions,
  staffDepartmentSelectValue,
} from '@/shared/utils/labDepartments';

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
  if (name === 'admin') return 'Admin';
  if (name === 'opd_billing') return 'OPD Billing';
  if (name === 'ipd') return 'IPD';
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
  const needsDepartment = roleRequiresDepartment(selectedRole?.name);
  const isLabTech = isLabTechnicianRole(selectedRole?.name);

  const roleOptions = useMemo(
    () =>
      filterHospitalAdminRegisterRoles(roles)?.map((role) => ({
        value: String(role.id),
        label: formatRoleLabel(role.name),
      })) ?? [],
    [roles]
  );

  const departmentOptions = useMemo(
    () => staffDepartmentSelectOptions(departments, selectedRole?.name),
    [departments, selectedRole?.name]
  );

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({
      ...prev,
      [field]: field === 'email' ? normalizeEmailInput(value) : value,
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

    if (needsDepartment && !form.department_id) {
      toast.error(
        isLabTech
          ? 'Please select Laboratory or Radiology for lab technician'
          : 'Please select a department for doctor',
      );
      return;
    }

    const departmentId = needsDepartment
      ? isLabTech
        ? await ensureLabTechDepartmentId(departments, form.department_id)
        : resolveStaffDepartmentPayloadId(departments, selectedRole?.name, form.department_id)
      : null;
    if (needsDepartment && departmentId == null) {
      toast.error(
        isLabTech
          ? 'Please select Laboratory or Radiology for lab technician'
          : 'Please select a department for doctor',
      );
      return;
    }

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim() || null,
      email: normalizeEmailInput(form.email.trim()),
      password: form.password,
      role_id: Number(form.role_id),
      department_id: departmentId,
    };

    try {
      const result = await registerMutation.mutateAsync({ data: payload });
      toast.success(result?.message || 'Staff registered successfully');
      setForm(EMPTY_FORM);
      navigate(ROUTES.MANAGER_STAFF);
    } catch (err) {
      const message =
        err?.status === 409
          ? 'Email already registered'
          : err?.message || 'Failed to register staff';
      toast.error(message);
    }
  };

  const passwordReady = form.password.length >= 8;
  const roleLabel = selectedRole ? formatRoleLabel(selectedRole.name) : '';

  return (
    <ManagerLayout pageTitle="Register Staff">
      <div className="admin-page staff-register-page">
        <div className="staff-register-layout">
          <form className="admin-card staff-register-shell" onSubmit={handleSubmit} autoComplete="off">
            <header className="staff-register-toolbar">
              <Button
                type="button"
                variant="ghost"
                className="staff-register-back"
                onClick={() => navigate(ROUTES.MANAGER_STAFF)}
              >
                <ArrowLeft size={16} aria-hidden />
                Back
              </Button>
              <div className="staff-register-heading">
                <span className="staff-register-heading__icon" aria-hidden>
                  <UserPlus size={20} strokeWidth={2} />
                </span>
                <div>
                  <h1>Register new staff</h1>
                  <p>Create a sign-in for someone who works at this hospital.</p>
                </div>
              </div>
            </header>

            {rolesError ? (
              <div className="staff-register-body">
                <QueryFeedback
                  isError
                  error={rolesQueryError}
                  onRetry={refetchRoles}
                />
              </div>
            ) : (
              <>
                <div className="staff-register-body">
                  <section className="staff-register-section">
                    <h2>
                      <User size={15} aria-hidden />
                      Personal details
                    </h2>
                    <div className="staff-register-grid">
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
                  </section>

                  <section className="staff-register-section">
                    <h2>
                      <KeyRound size={15} aria-hidden />
                      Account credentials
                    </h2>
                    <div className="staff-register-grid">
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
                          type="text"
                          autoComplete="new-password"
                          value={form.password}
                          onChange={handleChange('password')}
                          minLength={8}
                          required
                        />
                        <p className={`staff-register-hint${passwordReady ? ' is-ready' : ''}`}>
                          {passwordReady
                            ? 'Long enough to share with this person.'
                            : 'At least 8 characters. The password stays visible so you can share it.'}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="staff-register-section">
                    <h2>
                      <Shield size={15} aria-hidden />
                      Role assignment
                    </h2>
                    <div className="staff-register-grid">
                      <Select
                        label="Role *"
                        value={form.role_id}
                        onChange={(value) => {
                          const nextRole = roles?.find((r) => String(r.id) === String(value));
                          setForm((prev) => ({
                            ...prev,
                            role_id: value,
                            department_id:
                              nextRole?.name === selectedRole?.name ? prev.department_id : '',
                          }));
                        }}
                        options={roleOptions}
                        placeholder={rolesLoading ? 'Loading roles…' : 'Select role'}
                        disabled={rolesLoading || rolesError}
                      />
                      {needsDepartment ? (
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
                            label="Department *"
                            value={staffDepartmentSelectValue(
                              departments,
                              selectedRole?.name,
                              form.department_id,
                            )}
                            onChange={(value) =>
                              setForm((prev) => ({ ...prev, department_id: value }))
                            }
                            options={departmentOptions}
                            placeholder={
                              departmentsLoading
                                ? 'Loading departments…'
                                : isLabTech
                                  ? 'Laboratory or Radiology'
                                  : 'Select department'
                            }
                            disabled={departmentsLoading || departmentsError}
                          />
                        </div>
                      ) : (
                        <p className="staff-register-note">
                          Department is required only for doctors and lab technicians.
                        </p>
                      )}
                    </div>
                  </section>
                </div>

                <div className="staff-register-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate(ROUTES.MANAGER_STAFF)}
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
                    {registerMutation.isPending ? 'Registering…' : 'Register staff member'}
                  </Button>
                </div>
              </>
            )}
          </form>

          <aside className="staff-register-aside" aria-label="What this account needs">
            <h2>This account</h2>
            <dl>
              <div>
                <dt>Name</dt>
                <dd>{[form.first_name, form.last_name].filter(Boolean).join(' ') || 'Not entered'}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{form.email || 'Not entered'}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{roleLabel || 'Not selected'}</dd>
              </div>
              <div>
                <dt>Department</dt>
                <dd>
                  {needsDepartment
                    ? (departmentOptions.find((option) => option.value === String(form.department_id))?.label || 'Required')
                    : 'Not required'}
                </dd>
              </div>
            </dl>
            <p>They sign in with this email and the temporary password. You can change the role later from their staff record.</p>
          </aside>
        </div>
      </div>
    </ManagerLayout>
  );
}
