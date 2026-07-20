import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  Building2,
  Calendar,
  Mail,
  Pencil,
  Phone,
  Save,
  Shield,
  Trash2,
  User,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import SuperAdminLayout from '@/features/super-admin/components/SuperAdminLayout';
import AdminBackBar from '@/features/admin/components/AdminBackBar';
import AdminRoleBadge from '@/features/admin/components/AdminRoleBadge';
import AdminStaffStatusBadge from '@/features/admin/components/AdminStaffStatusBadge';
import {
  useActivateStaffMutation,
  useAdminDepartmentsQuery,
  useAdminRolesQuery,
  useAdminStaffDetailQuery,
  useDeleteStaffMutation,
  useUpdateStaffMutation,
} from '@/shared/hooks/queries/useAdminQuery';
import { Button, ConfirmDialog, Input, Label, QueryFeedback, Select } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';

function staffName(u) {
  if (!u) return '';
  if (u.full_name) return u.full_name;
  return `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
}

function formatRoleLabel(name) {
  if (!name) return '—';
  if (name === 'opd_billing') return 'OPD Billing';
  if (name === 'lab_technician') return 'Lab Technician';
  if (name === 'super_admin') return 'Super Admin';
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function InfoRow({ icon: Icon, label, value, emptyLabel = 'Not provided' }) {
  const isEmpty = value == null || String(value).trim() === '';
  return (
    <div className="sa-staff-detail__info-row">
      <div className="sa-staff-detail__info-icon" aria-hidden>
        <Icon size={16} />
      </div>
      <div className="sa-staff-detail__info-content">
        <span className="sa-staff-detail__info-label">{label}</span>
        <span className={`sa-staff-detail__info-value${isEmpty ? ' sa-staff-detail__info-value--muted' : ''}`}>
          {isEmpty ? emptyLabel : value}
        </span>
      </div>
    </div>
  );
}

function roleRequiresDepartment(roleName) {
  return roleName === 'doctor';
}

export default function SuperAdminStaffDetailPage() {
  const { id } = useParams();
  const userId = Number(id);
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [confirm, setConfirm] = useState(null);

  const apiQuery = useAdminStaffDetailQuery(userId, {
    enabled: Number.isFinite(userId) && userId > 0,
  });
  const rolesQuery = useAdminRolesQuery();
  const departmentsQuery = useAdminDepartmentsQuery();
  const updateMutation = useUpdateStaffMutation();
  const activateMutation = useActivateStaffMutation();
  const deleteMutation = useDeleteStaffMutation();

  const user = apiQuery.data;
  const roles = rolesQuery.data;
  const departments = departmentsQuery.data;
  const isLoading = apiQuery.isLoading;
  const isError = apiQuery.isError;
  const error = apiQuery.error;

  const selectedRole = roles?.find((r) => String(r.id) === String(form.role_id));
  const selectedRoleName = selectedRole?.name || user?.role_name || user?.role;
  const departmentRequired = roleRequiresDepartment(selectedRoleName);
  const isActive = user?.is_active !== false;
  const displayName = staffName(user);

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

  useEffect(() => {
    if (!user || editing) return;
    setForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone: user.phone || '',
      role_id: user.role_id ? String(user.role_id) : '',
      department_id: user.department_id ? String(user.department_id) : '',
    });
  }, [user, editing]);

  const cancelEdit = () => {
    if (!user) return;
    setEditing(false);
    setForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone: user.phone || '',
      role_id: user.role_id ? String(user.role_id) : '',
      department_id: user.department_id ? String(user.department_id) : '',
    });
  };

  const handleSave = async () => {
    if (departmentRequired && !form.department_id) {
      toast.error('Please select a department for doctor');
      return;
    }
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || null,
        phone: form.phone.trim() || null,
        role_id: Number(form.role_id),
        department_id:
          departmentRequired && form.department_id ? Number(form.department_id) : null,
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
      if (confirm.type === 'delete') {
        await deleteMutation.mutateAsync({ id: user.id });
        toast.success('Staff member deleted successfully');
        navigate(ROUTES.SUPER_ADMIN_STAFF);
      } else {
        await activateMutation.mutateAsync({
          id: user.id,
          is_active: !user.is_active,
        });
        toast.success('Staff status updated');
      }
    } catch (err) {
      toast.error(err?.message || 'Action failed');
    } finally {
      setConfirm(null);
    }
  }

  return (
    <SuperAdminLayout pageTitle="Staff Details">
      <div className="admin-page sa-staff-detail-page">
        <AdminBackBar onBack={() => navigate(ROUTES.SUPER_ADMIN_STAFF)} label="Back to staff">
          {user && !editing ? (
            <div className="sa-staff-detail__toolbar-actions">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil size={14} aria-hidden />
                Edit profile
              </Button>
              <Button
                variant="outline"
                size="sm"
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
              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                <X size={14} aria-hidden />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                <Save size={14} aria-hidden />
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          ) : null}
        </AdminBackBar>

        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={apiQuery.refetch}>
          {!user ? (
            <div className="admin-card sa-panel-card sa-staff-detail__empty">
              <div className="admin-empty-state">
                <p>Staff record not found.</p>
                <Button variant="outline" onClick={() => navigate(ROUTES.SUPER_ADMIN_STAFF)}>
                  Back to staff list
                </Button>
              </div>
            </div>
          ) : (
            <div className="sa-staff-detail">
              <header className="sa-staff-detail__hero">
                <div className="sa-staff-detail__hero-main">
                  <div className="sa-staff-detail__avatar" aria-hidden>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="sa-staff-detail__identity">
                    <div className="sa-staff-detail__title-row">
                      <h1 className="sa-staff-detail__name">{displayName}</h1>
                      <AdminRoleBadge roleName={user.role_name || user.role} />
                    </div>
                    <div className="sa-staff-detail__sub-row">
                      <p className="sa-staff-detail__email">
                        <Mail size={14} aria-hidden />
                        {user.email}
                      </p>
                      <AdminStaffStatusBadge isActive={isActive} />
                    </div>
                  </div>
                </div>
                <div className="sa-staff-detail__hero-footer">
                  <div className="sa-staff-detail__stat">
                    <Activity size={15} aria-hidden />
                    <div>
                      <span className="sa-staff-detail__stat-value">{user.login_count ?? 0}</span>
                      <span className="sa-staff-detail__stat-label">Logins</span>
                    </div>
                  </div>
                  <div className="sa-staff-detail__stat">
                    <Calendar size={15} aria-hidden />
                    <div>
                      <span className="sa-staff-detail__stat-value">
                        {user.last_login ? formatDate(user.last_login) : 'Never'}
                      </span>
                      <span className="sa-staff-detail__stat-label">Last login</span>
                    </div>
                  </div>
                  <div className="sa-staff-detail__stat">
                    <User size={15} aria-hidden />
                    <div>
                      <span className="sa-staff-detail__stat-value">{formatDate(user.created_at)}</span>
                      <span className="sa-staff-detail__stat-label">Member since</span>
                    </div>
                  </div>
                </div>
              </header>

              {editing ? (
                <section className="sa-staff-detail__panel sa-staff-detail__panel--edit">
                  <div className="sa-staff-detail__panel-head">
                    <h2>Edit profile</h2>
                    <p>Update personal details and role assignment.</p>
                  </div>
                  <div className="sa-staff-detail__form-grid">
                    <div className="sa-staff-detail__form-section">
                      <h3>Personal details</h3>
                      <div className="sa-staff-detail__fields sa-staff-detail__fields--2">
                        <div>
                          <Label htmlFor="sa_staff_first">First name</Label>
                          <Input
                            id="sa_staff_first"
                            value={form.first_name}
                            onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="sa_staff_last">Last name</Label>
                          <Input
                            id="sa_staff_last"
                            value={form.last_name}
                            onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="sa_staff_phone">Phone</Label>
                          <Input
                            id="sa_staff_phone"
                            value={form.phone}
                            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                            placeholder="+91 …"
                          />
                        </div>
                        <div>
                          <Label htmlFor="sa_staff_email">Email</Label>
                          <Input id="sa_staff_email" value={user.email} disabled />
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
                                  nextRole?.name === 'doctor' ? f.department_id : '',
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
                              <span className="sa-register-field__req" aria-hidden> *</span>
                            ) : null}
                          </Label>
                          <Select
                            value={form.department_id}
                            onChange={(value) => setForm((f) => ({ ...f, department_id: value }))}
                            options={departmentOptions}
                            placeholder={
                              departmentRequired ? 'Select department' : 'Only for doctor role'
                            }
                            disabled={!departmentRequired}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              ) : (
                <div className="sa-staff-detail__grid">
                  <section className="sa-staff-detail__panel">
                    <div className="sa-staff-detail__panel-head">
                      <h2>Profile information</h2>
                      <p>Personal and contact details on file.</p>
                    </div>
                    <div className="sa-staff-detail__info-list">
                      <InfoRow icon={User} label="Full name" value={displayName} />
                      <InfoRow icon={Mail} label="Email address" value={user.email} />
                      <InfoRow
                        icon={Phone}
                        label="Phone number"
                        value={user.phone}
                        emptyLabel="Not provided — use Edit profile to add"
                      />
                    </div>
                  </section>

                  <section className="sa-staff-detail__panel">
                    <div className="sa-staff-detail__panel-head">
                      <h2>Role &amp; organization</h2>
                      <p>Access level and department assignment.</p>
                    </div>
                    <div className="sa-staff-detail__info-list">
                      <InfoRow
                        icon={Shield}
                        label="System role"
                        value={formatRoleLabel(user.role_name || user.role)}
                      />
                      <InfoRow
                        icon={Building2}
                        label="Department"
                        value={user.department_name || user.department}
                        emptyLabel={
                          roleRequiresDepartment(user.role_name || user.role)
                            ? 'Not assigned — use Edit profile to set'
                            : 'Not assigned (optional for this role)'
                        }
                      />
                      <InfoRow icon={Calendar} label="Account created" value={formatDate(user.created_at)} />
                    </div>
                  </section>

                  <section className="sa-staff-detail__panel sa-staff-detail__panel--activity">
                    <div className="sa-staff-detail__panel-head">
                      <h2>Account activity</h2>
                      <p>Login history and engagement.</p>
                    </div>
                    <div className="sa-staff-detail__activity-grid">
                      <div className="sa-staff-detail__activity-card">
                        <Activity size={18} aria-hidden />
                        <div>
                          <span className="sa-staff-detail__activity-value">{user.login_count ?? 0}</span>
                          <span className="sa-staff-detail__activity-label">Total logins</span>
                        </div>
                      </div>
                      <div className="sa-staff-detail__activity-card">
                        <Calendar size={18} aria-hidden />
                        <div>
                          <span className="sa-staff-detail__activity-value">
                            {user.last_login ? formatDate(user.last_login) : 'Never'}
                          </span>
                          <span className="sa-staff-detail__activity-label">Last sign-in</span>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {!editing ? (
                <section className="sa-staff-detail__danger">
                  <div className="sa-staff-detail__danger-copy">
                    <h3>Remove staff member</h3>
                    <p>
                      Permanently deletes this account and revokes access. This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="sa-staff-detail__danger-btn"
                    onClick={() => setConfirm({ type: 'delete' })}
                  >
                    <Trash2 size={14} aria-hidden />
                    Delete account
                  </Button>
                </section>
              ) : null}
            </div>
          )}
        </QueryFeedback>
      </div>

      <ConfirmDialog
        isOpen={Boolean(confirm)}
        title={confirm?.type === 'delete' ? 'Delete staff member' : 'Update account status'}
        message={
          confirm?.type === 'delete'
            ? `Permanently delete ${displayName}? They will lose all system access.`
            : `${isActive ? 'Deactivate' : 'Activate'} ${displayName}?`
        }
        confirmLabel={confirm?.type === 'delete' ? 'Delete' : 'Confirm'}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </SuperAdminLayout>
  );
}
