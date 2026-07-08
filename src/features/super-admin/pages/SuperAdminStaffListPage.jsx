import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Plus, Trash2 } from 'lucide-react';
import SuperAdminLayout from '@/features/super-admin/components/SuperAdminLayout';
import SuperAdminPageHeader from '@/features/super-admin/components/SuperAdminPageHeader';
import AdminRoleBadge from '@/features/admin/components/AdminRoleBadge';
import AdminStaffStatusBadge from '@/features/admin/components/AdminStaffStatusBadge';
import { useSuperAdminDemoMode } from '@/features/super-admin/hooks/useSuperAdminDemoMode';
import {
  MOCK_SUPER_ADMIN_ROLES,
  MOCK_SUPER_ADMIN_STAFF,
} from '@/features/super-admin/mock/superAdminMockData';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import {
  useActivateStaffMutation,
  useAdminRolesQuery,
  useAdminStaffListQuery,
  useDeleteStaffMutation,
} from '@/shared/hooks/queries/useAdminQuery';
import {
  Button,
  ConfirmDialog,
  QueryFeedback,
  SearchBar,
  Select,
} from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';

function staffName(u) {
  if (!u) return 'this user';
  if (u.full_name) return u.full_name;
  return `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'this user';
}

function staffDetailPath(id) {
  return ROUTES.SUPER_ADMIN_STAFF_DETAIL.replace(':id', String(id));
}

export default function SuperAdminStaffListPage() {
  const navigate = useNavigate();
  const isDemo = useSuperAdminDemoMode();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [confirm, setConfirm] = useState(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const rolesQuery = useAdminRolesQuery({ enabled: !isDemo });
  const roles = isDemo ? MOCK_SUPER_ADMIN_ROLES : rolesQuery.data;

  const queryParams = useMemo(() => {
    const params = { page: 1, limit: 100 };
    if (debouncedSearch) params.search = debouncedSearch;
    if (roleFilter !== 'all') params.role_id = Number(roleFilter);
    return params;
  }, [debouncedSearch, roleFilter]);

  const staffQuery = useAdminStaffListQuery(queryParams, { enabled: !isDemo });

  const demoStaff = useMemo(() => {
    let rows = [...MOCK_SUPER_ADMIN_STAFF];
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      rows = rows.filter(
        (u) =>
          staffName(u).toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      );
    }
    if (roleFilter !== 'all') {
      rows = rows.filter((u) => String(u.role_id) === roleFilter);
    }
    return rows;
  }, [debouncedSearch, roleFilter]);

  const staff = isDemo ? demoStaff : staffQuery.data?.staff ?? [];
  const isLoading = isDemo ? false : staffQuery.isLoading;
  const isError = isDemo ? false : staffQuery.isError;
  const error = isDemo ? null : staffQuery.error;

  const activateMutation = useActivateStaffMutation();
  const deleteMutation = useDeleteStaffMutation();

  const roleOptions = useMemo(
    () => [
      { value: 'all', label: 'All roles' },
      ...(roles?.map((r) => ({
        value: String(r.id),
        label: r.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      })) ?? []),
    ],
    [roles],
  );

  async function handleConfirm() {
    if (!confirm) return;

    if (isDemo) {
      toast.info('Changes are not persisted in demo mode.');
      setConfirm(null);
      return;
    }

    try {
      if (confirm.type === 'delete') {
        await deleteMutation.mutateAsync({ id: confirm.user.id });
        toast.success('Staff member deleted successfully');
      } else {
        await activateMutation.mutateAsync({
          id: confirm.user.id,
          is_active: !confirm.user.is_active,
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
    <SuperAdminLayout pageTitle="Staff">
      <div className="admin-page">
        <SuperAdminPageHeader
          eyebrow="People"
          title="Staff members"
          subtitle="Manage all hospital staff accounts and roles."
          mockBadge={isDemo}
          actions={(
            <Button onClick={() => navigate(ROUTES.SUPER_ADMIN_STAFF_NEW)}>
              <Plus size={16} aria-hidden />
              Register Staff
            </Button>
          )}
        />

        <div className="admin-card sa-panel-card sa-filters-card">
          <div className="admin-card__body">
            <div className="admin-filters">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search by name or email…"
              />
              <Select
                value={roleFilter}
                onChange={setRoleFilter}
                options={roleOptions}
                placeholder="All roles"
              />
            </div>
          </div>
        </div>

        <div className="admin-card sa-panel-card admin-card--flat admin-datatable">
          <QueryFeedback
            isLoading={isLoading}
            isError={isError}
            error={error}
            onRetry={staffQuery.refetch}
          >
            {!staff.length ? (
              <div className="admin-empty-state">
                <p>No staff found.</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th className="admin-table__actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((u) => (
                      <tr key={u.id}>
                        <td>{staffName(u)}</td>
                        <td>{u.email}</td>
                        <td><AdminRoleBadge roleName={u.role || u.role_name} /></td>
                        <td>
                          <AdminStaffStatusBadge
                            isActive={u.is_active !== false && u.status !== 'inactive'}
                          />
                        </td>
                        <td className="admin-table__actions">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(staffDetailPath(u.id))}
                          >
                            <Eye size={14} aria-hidden />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirm({ type: 'activate', user: u })}
                          >
                            {u.is_active === false || u.status === 'inactive'
                              ? 'Activate'
                              : 'Deactivate'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirm({ type: 'delete', user: u })}
                          >
                            <Trash2 size={14} aria-hidden />
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </QueryFeedback>
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(confirm)}
        title={confirm?.type === 'delete' ? 'Delete user' : 'Update status'}
        message={
          confirm
            ? confirm.type === 'delete'
              ? `Permanently delete ${staffName(confirm.user)}?`
              : `Change status for ${staffName(confirm.user)}?`
            : ''
        }
        confirmLabel={confirm?.type === 'delete' ? 'Delete' : 'Confirm'}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </SuperAdminLayout>
  );
}
