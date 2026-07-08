import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SuperAdminLayout from '@/features/super-admin/components/SuperAdminLayout';
import AdminBackBar from '@/features/admin/components/AdminBackBar';
import AdminRoleBadge from '@/features/admin/components/AdminRoleBadge';
import AdminStaffStatusBadge from '@/features/admin/components/AdminStaffStatusBadge';
import { useSuperAdminDemoMode } from '@/features/super-admin/hooks/useSuperAdminDemoMode';
import { MOCK_SUPER_ADMIN_STAFF } from '@/features/super-admin/mock/superAdminMockData';
import {
  useAdminStaffDetailQuery,
  useUpdateStaffMutation,
} from '@/shared/hooks/queries/useAdminQuery';
import { Button, ConfirmDialog, Input, Label, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';

function staffName(u) {
  if (!u) return '';
  if (u.full_name) return u.full_name;
  return `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
}

export default function SuperAdminStaffDetailPage() {
  const { id } = useParams();
  const userId = Number(id);
  const navigate = useNavigate();
  const isDemo = useSuperAdminDemoMode();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [confirm, setConfirm] = useState(null);

  const apiQuery = useAdminStaffDetailQuery(userId, {
    enabled: !isDemo && Number.isFinite(userId) && userId > 0,
  });
  const updateMutation = useUpdateStaffMutation();

  const demoUser = MOCK_SUPER_ADMIN_STAFF.find((row) => String(row.id) === String(id));
  const user = isDemo ? demoUser : apiQuery.data;
  const isLoading = isDemo ? false : apiQuery.isLoading;
  const isError = isDemo ? false : apiQuery.isError;
  const error = isDemo ? null : apiQuery.error;

  useEffect(() => {
    if (!user || editing) return;
    setForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone: user.phone || '',
    });
  }, [user, editing]);

  const startEdit = () => {
    if (!user) return;
    setEditing(true);
  };

  const handleSave = async () => {
    if (isDemo) {
      toast.info('Changes are not persisted in demo mode.');
      setEditing(false);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: userId,
        data: {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim() || null,
          phone: form.phone.trim() || null,
        },
      });
      toast.success('Staff profile updated');
      setEditing(false);
    } catch (err) {
      toast.error(err?.message || 'Update failed');
    }
  };

  const handleConfirm = () => {
    if (!confirm || !user) return;
    if (isDemo) {
      toast.info('Changes are not persisted in demo mode.');
      setConfirm(null);
      if (confirm.type === 'delete') {
        navigate(ROUTES.SUPER_ADMIN_STAFF);
      }
      return;
    }
    setConfirm(null);
  };

  return (
    <SuperAdminLayout pageTitle="Staff Details">
      <div className="admin-page">
        <AdminBackBar onBack={() => navigate(ROUTES.SUPER_ADMIN_STAFF)} />

        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={apiQuery.refetch}>
          {!user ? (
            <div className="admin-card sa-panel-card">
              <div className="admin-empty-state">
                <p>Staff record not found.</p>
                <Button variant="outline" onClick={() => navigate(ROUTES.SUPER_ADMIN_STAFF)}>
                  Back to staff list
                </Button>
              </div>
            </div>
          ) : (
            <div className="admin-detail-grid">
              <div className="admin-card sa-panel-card">
                <div className="admin-card__body admin-profile-card">
                  <div className="admin-profile-card__avatar">
                    {staffName(user).charAt(0).toUpperCase()}
                  </div>
                  <h2>{staffName(user)}</h2>
                  <p className="admin-help-text">{user.email}</p>
                  <AdminStaffStatusBadge
                    isActive={user.is_active !== false && user.status !== 'inactive'}
                  />
                  <AdminRoleBadge roleName={user.role || user.role_name} />
                  <div
                    className="admin-form-actions"
                    style={{ flexDirection: 'column', width: '100%' }}
                  >
                    <Button onClick={editing ? () => setEditing(false) : startEdit}>
                      {editing ? 'Cancel edit' : 'Edit profile'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="admin-card sa-panel-card">
                <div className="admin-card__header">
                  <h2 className="admin-card__title">{editing ? 'Edit profile' : 'Details'}</h2>
                </div>
                <div className="admin-card__body">
                  {editing ? (
                    <div className="admin-form-grid">
                      <div>
                        <Label>First name</Label>
                        <Input
                          value={form.first_name}
                          onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Last name</Label>
                        <Input
                          value={form.last_name}
                          onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={form.phone}
                          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        />
                      </div>
                      <div className="admin-form-actions">
                        <Button onClick={handleSave} disabled={updateMutation.isPending}>
                          {updateMutation.isPending ? 'Saving…' : 'Save changes'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <dl className="admin-detail-list">
                      <div><dt>First name</dt><dd>{user.first_name || '—'}</dd></div>
                      <div><dt>Last name</dt><dd>{user.last_name || '—'}</dd></div>
                      <div><dt>Email</dt><dd>{user.email}</dd></div>
                      <div><dt>Phone</dt><dd>{user.phone || '—'}</dd></div>
                      <div><dt>Department</dt><dd>{user.department || '—'}</dd></div>
                      <div>
                        <dt>Created</dt>
                        <dd>
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString()
                            : '—'}
                        </dd>
                      </div>
                    </dl>
                  )}
                </div>
              </div>
            </div>
          )}
        </QueryFeedback>
      </div>

      <ConfirmDialog
        isOpen={Boolean(confirm)}
        title={confirm?.type === 'delete' ? 'Delete user' : 'Update status'}
        message={confirm ? `Change status for ${staffName(user)}?` : ''}
        confirmLabel="Confirm"
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </SuperAdminLayout>
  );
}
