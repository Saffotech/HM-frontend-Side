import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Plus, Trash2, UserCheck, UserX } from 'lucide-react';
import SuperAdminLayout from '@/features/super-admin/components/SuperAdminLayout';
import SuperAdminPageHeader from '@/features/super-admin/components/SuperAdminPageHeader';
import AdminRoleBadge from '@/features/admin/components/AdminRoleBadge';
import AdminStaffStatusBadge from '@/features/admin/components/AdminStaffStatusBadge';
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
  TablePagination,
} from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';

const PAGE_SIZE = 20;

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
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const rolesQuery = useAdminRolesQuery();
  const roles = rolesQuery.data;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, statusFilter]);

  const queryParams = useMemo(() => {
    const params = { page, limit: PAGE_SIZE };
    if (debouncedSearch) params.search = debouncedSearch;
    if (roleFilter !== 'all') params.role_id = Number(roleFilter);
    if (statusFilter === 'active') params.is_active = true;
    if (statusFilter === 'inactive') params.is_active = false;
    return params;
  }, [debouncedSearch, roleFilter, statusFilter, page]);

  const staffQuery = useAdminStaffListQuery(queryParams);

  const staff = staffQuery.data?.staff ?? [];
  const total = staffQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isLoading = staffQuery.isLoading;
  const isError = staffQuery.isError;
  const error = staffQuery.error;

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

  const statusOptions = [
    { value: 'all', label: 'All statuses' },
    { value: 'active', label: 'Active only' },
    { value: 'inactive', label: 'Inactive only' },
  ];

  async function handleConfirm() {
    if (!confirm) return;

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
      <div className="admin-page sa-staff-list-page">
        <SuperAdminPageHeader
          title="Staff members"
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
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                options={statusOptions}
                placeholder="All statuses"
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
              <>
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
                            <AdminStaffStatusBadge isActive={u.is_active !== false} />
                          </td>
                          <td className="admin-table__actions">
                            <div className="admin-table__actions-inner sa-staff-list__actions">
                              <button
                                type="button"
                                className="sa-staff-list__action sa-staff-list__action--view"
                                onClick={() => navigate(staffDetailPath(u.id))}
                              >
                                <Eye size={14} aria-hidden />
                                View
                              </button>
                              <button
                                type="button"
                                className={`sa-staff-list__action ${
                                  u.is_active === false
                                    ? 'sa-staff-list__action--activate'
                                    : 'sa-staff-list__action--deactivate'
                                }`}
                                onClick={() => setConfirm({ type: 'activate', user: u })}
                              >
                                {u.is_active === false ? (
                                  <UserCheck size={14} aria-hidden />
                                ) : (
                                  <UserX size={14} aria-hidden />
                                )}
                                {u.is_active === false ? 'Activate' : 'Deactivate'}
                              </button>
                              <button
                                type="button"
                                className="sa-staff-list__action sa-staff-list__action--delete"
                                onClick={() => setConfirm({ type: 'delete', user: u })}
                              >
                                <Trash2 size={14} aria-hidden />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePagination
                  page={page}
                  totalPages={totalPages}
                  totalItems={total}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                  itemLabel="staff"
                />
              </>
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
