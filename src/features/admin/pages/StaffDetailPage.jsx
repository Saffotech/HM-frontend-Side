import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Activity,
  Briefcase,
  Calendar,
  IdCard,
  Mail,
  Pencil,
  Save,
  User,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminBackBar from '@/features/admin/components/AdminBackBar';
import AdminRoleBadge from '@/features/admin/components/AdminRoleBadge';
import AdminStaffStatusBadge from '@/features/admin/components/AdminStaffStatusBadge';
import {
  useActivateStaffMutation,
  useAdminDepartmentsQuery,
  useAdminRolesQuery,
  useAdminStaffDetailQuery,
  useUpdateStaffMutation,
} from '@/shared/hooks/queries/useAdminQuery';
import { Button, ConfirmDialog, Input, Label, QueryFeedback, Select } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { filterHospitalAdminRegisterRoles } from '@/features/admin/utils/hospitalAdminRoles';
import { toast } from '@/shared/utils/toast';
import { ensureLabTechDepartmentId } from '@/features/admin/utils/ensureLabTechDepartment';
import {
  isLabTechnicianRole,
  resolveStaffDepartmentPayloadId,
  roleRequiresDepartment,
  staffDepartmentSelectOptions,
  staffDepartmentSelectValue,
} from '@/shared/utils/labDepartments';
import './StaffDetailPage.css';

function titleCaseName(value) {
  if (!value) return '';
  return String(value)
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function staffName(u) {
  if (!u) return '';
  if (u.full_name) return titleCaseName(u.full_name);
  const raw = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
  return u.email && raw === u.email ? raw : titleCaseName(raw);
}

function staffInitials(u) {
  const first = (u?.first_name || '').trim().charAt(0);
  const last = (u?.last_name || '').trim().charAt(0);
  const letters = `${first}${last}`.toUpperCase();
  if (letters) return letters;
  return (u?.email || 'S').charAt(0).toUpperCase();
}

function formatRoleLabel(name) {
  if (!name) return '—';
  if (name === 'opd_billing') return 'OPD Billing';
  if (name === 'ipd') return 'IPD';
  if (name === 'lab_technician') return 'Lab Technician';
  if (name === 'receptionist') return 'Receptionist';
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function digitsOnlyMax10(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 10);
}

function DetailField({ label, value, empty = '—' }) {
  const isEmpty = value == null || String(value).trim() === '';
  return (
    <div className={`sa-staff-detail__field${isEmpty ? ' sa-staff-detail__field--empty' : ''}`}>
      <dt className="sa-staff-detail__field-label">{label}</dt>
      <dd
        className={`sa-staff-detail__field-value${isEmpty ? ' sa-staff-detail__field-value--empty' : ''}`}
      >
        {isEmpty ? empty : value}
      </dd>
    </div>
  );
}

function userToForm(user) {
  if (!user) return {};
  return {
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    phone: digitsOnlyMax10(user.phone),
    role_id: user.role_id ? String(user.role_id) : '',
    department_id: user.department_id ? String(user.department_id) : '',
    employee_id: user.employee_id || '',
    joining_date: user.joining_date ? String(user.joining_date).slice(0, 10) : '',
  };
}

export default function StaffDetailPage() {
  const { id } = useParams();
  const userId = Number(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEdit = searchParams.get('edit') === '1' || searchParams.get('edit') === 'true';

  const [editing, setEditing] = useState(initialEdit);
  const [form, setForm] = useState({});
  const [confirm, setConfirm] = useState(null);

  const apiQuery = useAdminStaffDetailQuery(userId, {
    enabled: Number.isFinite(userId) && userId > 0,
  });
  const { data: roles } = useAdminRolesQuery();
  const { data: departments } = useAdminDepartmentsQuery();
  const updateMutation = useUpdateStaffMutation();
  const activateMutation = useActivateStaffMutation();

  const user = apiQuery.data;
  const isLoading = apiQuery.isLoading;
  const isError = apiQuery.isError;
  const error = apiQuery.error;

  const selectedRole = roles?.find((r) => String(r.id) === String(form.role_id));
  const selectedRoleName = selectedRole?.name || user?.role_name;
  const departmentRequired = roleRequiresDepartment(selectedRoleName);
  const isActive = user?.is_active !== false;
  const displayName = staffName(user) || 'Staff Details';

  const roleOptions = useMemo(
    () =>
      filterHospitalAdminRegisterRoles(roles, {
        includeRoleId: user?.role_id,
      })?.map((role) => ({
        value: String(role.id),
        label: formatRoleLabel(role.name),
      })) ?? [],
    [roles, user?.role_id],
  );

  const departmentOptions = useMemo(
    () => staffDepartmentSelectOptions(departments, selectedRoleName),
    [departments, selectedRoleName],
  );

  useEffect(() => {
    if (!user || editing) return;
    setForm(userToForm(user));
  }, [user, editing]);

  const cancelEdit = () => {
    if (!user) return;
    setEditing(false);
    setForm(userToForm(user));
  };

  const handleSave = async () => {
    if (departmentRequired && !form.department_id) {
      toast.error(
        isLabTechnicianRole(selectedRoleName)
          ? 'Please select Laboratory or Radiology for lab technician'
          : 'Please select a department for doctor',
      );
      return;
    }
    const departmentId = departmentRequired
      ? isLabTechnicianRole(selectedRoleName)
        ? await ensureLabTechDepartmentId(departments, form.department_id)
        : resolveStaffDepartmentPayloadId(departments, selectedRoleName, form.department_id)
      : null;
    if (departmentRequired && departmentId == null) {
      toast.error(
        isLabTechnicianRole(selectedRoleName)
          ? 'Please select Laboratory or Radiology for lab technician'
          : 'Please select a department for doctor',
      );
      return;
    }
    const phone = digitsOnlyMax10(form.phone);
    if (phone && phone.length !== 10) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || null,
        phone: phone || null,
        role_id: Number(form.role_id),
        department_id: departmentId,
        employee_id: (form.employee_id || '').trim() || null,
        joining_date: form.joining_date || null,
      };
      await updateMutation.mutateAsync({ id: userId, data: payload });
      toast.success('Staff profile updated');
      setEditing(false);
    } catch (err) {
      toast.error(err?.message || 'Update failed');
    }
  };

  async function handleConfirm() {
    if (!confirm || !user) return;
    try {
      await activateMutation.mutateAsync({
        id: user.id,
        is_active: !user.is_active,
      });
      toast.success('Staff status updated');
    } catch (err) {
      toast.error(err?.message || 'Action failed');
    } finally {
      setConfirm(null);
    }
  }

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
    <AdminLayout pageTitle={displayName}>
      <div className="admin-page sa-staff-detail-page staff-detail-page">
        <AdminBackBar onBack={() => navigate(ROUTES.ADMIN_STAFF)} label="Back to staff">
          {user && !editing ? (
            <div className="sa-staff-detail__toolbar-actions">
              <Button
                size="sm"
                className="sa-staff-detail__btn sa-staff-detail__btn--edit"
                onClick={() => setEditing(true)}
              >
                <Pencil size={14} aria-hidden />
                Edit profile
              </Button>
              <Button
                size="sm"
                className={`sa-staff-detail__btn ${
                  isActive
                    ? 'sa-staff-detail__btn--deactivate'
                    : 'sa-staff-detail__btn--activate'
                }`}
                onClick={() => setConfirm({ type: 'activate' })}
              >
                {isActive ? (
                  <>
                    <UserX size={14} aria-hidden />
                    Deactivate
                  </>
                ) : (
                  <>
                    <UserCheck size={14} aria-hidden />
                    Activate
                  </>
                )}
              </Button>
            </div>
          ) : null}
          {editing ? (
            <div className="sa-staff-detail__toolbar-actions">
              <Button
                size="sm"
                className="sa-staff-detail__btn sa-staff-detail__btn--cancel"
                onClick={cancelEdit}
              >
                <X size={14} aria-hidden />
                Cancel
              </Button>
              <Button
                size="sm"
                className="sa-staff-detail__btn sa-staff-detail__btn--save"
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                <Save size={14} aria-hidden />
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          ) : null}
        </AdminBackBar>

        <QueryFeedback
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={apiQuery.refetch}
        >
          {!user ? (
            <div className="admin-card sa-staff-detail__empty">
              <div className="admin-empty-state">
                <p>Staff record not found.</p>
                <Button variant="outline" onClick={() => navigate(ROUTES.ADMIN_STAFF)}>
                  Back to staff list
                </Button>
              </div>
            </div>
          ) : (
            <div className="sa-staff-detail">
              <header className="sa-staff-detail__hero">
                <div className="sa-staff-detail__hero-main">
                  <div className="sa-staff-detail__avatar" aria-hidden>
                    {staffInitials(user)}
                  </div>
                  <div className="sa-staff-detail__identity">
                    <div className="sa-staff-detail__title-row">
                      <h1 className="sa-staff-detail__name">{displayName}</h1>
                      <AdminRoleBadge roleName={user.role_name} />
                      <AdminStaffStatusBadge isActive={isActive} />
                    </div>
                    <p className="sa-staff-detail__email">
                      <Mail size={14} aria-hidden />
                      <a href={`mailto:${user.email}`}>{user.email}</a>
                    </p>
                  </div>
                </div>
                <div className="sa-staff-detail__hero-footer" role="list">
                  <div className="sa-staff-detail__stat sa-staff-detail__stat--logins" role="listitem">
                    <span className="sa-staff-detail__stat-icon" aria-hidden>
                      <Activity size={16} />
                    </span>
                    <div>
                      <span className="sa-staff-detail__stat-value">{user.login_count ?? 0}</span>
                      <span className="sa-staff-detail__stat-label">Total logins</span>
                    </div>
                  </div>
                  <div className="sa-staff-detail__stat sa-staff-detail__stat--last" role="listitem">
                    <span className="sa-staff-detail__stat-icon" aria-hidden>
                      <Calendar size={16} />
                    </span>
                    <div>
                      <span className="sa-staff-detail__stat-value">
                        {formatDate(user.last_login) || 'Never'}
                      </span>
                      <span className="sa-staff-detail__stat-label">Last login</span>
                    </div>
                  </div>
                  <div className="sa-staff-detail__stat sa-staff-detail__stat--since" role="listitem">
                    <span className="sa-staff-detail__stat-icon" aria-hidden>
                      <User size={16} />
                    </span>
                    <div>
                      <span className="sa-staff-detail__stat-value">
                        {formatDate(user.created_at) || '—'}
                      </span>
                      <span className="sa-staff-detail__stat-label">Member since</span>
                    </div>
                  </div>
                </div>
              </header>

              {editing ? (
                <section className="sa-staff-detail__panel sa-staff-detail__panel--edit sa-staff-detail__panel--personal">
                  <div className="sa-staff-detail__panel-head">
                    <div className="sa-staff-detail__panel-title">
                      <span className="sa-staff-detail__panel-icon" aria-hidden>
                        <Briefcase size={18} />
                      </span>
                      <div>
                        <h2>Edit staff profile</h2>
                        <p>Update contact details, role, and employment record.</p>
                      </div>
                    </div>
                  </div>
                  <div className="sa-staff-detail__form-grid">
                    <div className="sa-staff-detail__form-section">
                      <h3>Personal details</h3>
                      <div className="sa-staff-detail__fields sa-staff-detail__fields--2">
                        <div>
                          <Label htmlFor="admin_staff_first">First name</Label>
                          <Input
                            id="admin_staff_first"
                            value={form.first_name || ''}
                            onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="admin_staff_last">Last name</Label>
                          <Input
                            id="admin_staff_last"
                            value={form.last_name || ''}
                            onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="admin_staff_phone">Phone</Label>
                          <Input
                            id="admin_staff_phone"
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            value={form.phone || ''}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, phone: digitsOnlyMax10(e.target.value) }))
                            }
                            placeholder="10-digit number"
                          />
                        </div>
                        <div>
                          <Label htmlFor="admin_staff_email">Email</Label>
                          <Input id="admin_staff_email" value={user.email} disabled />
                        </div>
                      </div>
                    </div>
                    <div className="sa-staff-detail__form-section">
                      <h3>Role &amp; department</h3>
                      <div className="sa-staff-detail__fields sa-staff-detail__fields--2">
                        <div>
                          <Label>Role</Label>
                          <Select
                            value={form.role_id}
                            onChange={(value) => {
                              const nextRole = roles?.find((r) => String(r.id) === String(value));
                              setForm((f) => ({
                                ...f,
                                role_id: value,
                                department_id:
                                  nextRole?.name === selectedRoleName ? f.department_id : '',
                              }));
                            }}
                            options={roleOptions}
                            placeholder="Select role"
                          />
                        </div>
                        <div>
                          <Label>
                            Department
                            {departmentRequired ? (
                              <span className="sa-register-field__req" aria-hidden>
                                {' '}
                                *
                              </span>
                            ) : null}
                          </Label>
                          <Select
                            value={staffDepartmentSelectValue(
                              departments,
                              selectedRoleName,
                              form.department_id,
                            )}
                            onChange={(value) => setForm((f) => ({ ...f, department_id: value }))}
                            options={departmentOptions}
                            placeholder={
                              departmentRequired
                                ? isLabTechnicianRole(selectedRoleName)
                                  ? 'Laboratory or Radiology'
                                  : 'Select department'
                                : 'Only for doctor / lab technician'
                            }
                            disabled={!departmentRequired}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="sa-staff-detail__form-section">
                      <h3>Employment</h3>
                      <p className="sa-staff-detail__form-hint">
                        Visible as read-only on the staff member&apos;s Account tab.
                      </p>
                      <div className="sa-staff-detail__fields sa-staff-detail__fields--2">
                        <div>
                          <Label htmlFor="admin_staff_emp">Employee ID</Label>
                          <Input
                            id="admin_staff_emp"
                            value={form.employee_id || ''}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, employee_id: e.target.value }))
                            }
                            placeholder="e.g. EMP-001"
                          />
                        </div>
                        <div>
                          <Label htmlFor="admin_staff_join">Joining date</Label>
                          <Input
                            id="admin_staff_join"
                            type="date"
                            value={form.joining_date || ''}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, joining_date: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              ) : (
                <div className="sa-staff-detail__grid">
                  <section className="sa-staff-detail__panel sa-staff-detail__panel--personal">
                    <div className="sa-staff-detail__panel-head">
                      <div className="sa-staff-detail__panel-title">
                        <span className="sa-staff-detail__panel-icon" aria-hidden>
                          <User size={18} />
                        </span>
                        <div>
                          <h2>Personal details</h2>
                          <p>Contact information on record</p>
                        </div>
                      </div>
                    </div>
                    <dl className="sa-staff-detail__fields-grid">
                      <DetailField label="Full name" value={displayName} />
                      <DetailField label="Email" value={user.email} />
                      <DetailField label="Phone" value={user.phone} />
                      <DetailField label="Account created" value={formatDate(user.created_at)} />
                    </dl>
                  </section>

                  <section className="sa-staff-detail__panel sa-staff-detail__panel--employment">
                    <div className="sa-staff-detail__panel-head">
                      <div className="sa-staff-detail__panel-title">
                        <span className="sa-staff-detail__panel-icon" aria-hidden>
                          <IdCard size={18} />
                        </span>
                        <div>
                          <h2>Employment</h2>
                          <p>Role, department, and staff identifiers</p>
                        </div>
                      </div>
                    </div>
                    <dl className="sa-staff-detail__fields-grid">
                      <DetailField
                        label="System role"
                        value={formatRoleLabel(user.role_name)}
                      />
                      <DetailField
                        label="Department"
                        value={user.department_name}
                        empty={
                          roleRequiresDepartment(user.role_name)
                            ? 'Required — not assigned'
                            : '—'
                        }
                      />
                      <DetailField label="Employee ID" value={user.employee_id} />
                      <DetailField
                        label="Joining date"
                        value={formatDate(user.joining_date)}
                      />
                    </dl>
                  </section>
                </div>
              )}
            </div>
          )}
        </QueryFeedback>
      </div>

      <ConfirmDialog
        isOpen={Boolean(confirm)}
        title="Update account status"
        message={`${isActive ? 'Deactivate' : 'Activate'} ${displayName}?`}
        confirmLabel="Confirm"
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </AdminLayout>
  );
}
