import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, MoreHorizontal, Pencil, Plus, Search, Trash2, UserCheck, UserX } from 'lucide-react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminStaffStatusBadge from '@/features/admin/components/AdminStaffStatusBadge';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useAuth } from '@/shared/hooks/useAuth';
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

const PAGE_SIZE = 10;

function formatRoleLabel(name) {
  if (name === 'opd_billing') return 'OPD Billing';
  return name || '—';
}

export default function StaffListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = user?.user_id ?? user?.id;

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, statusFilter]);

  const queryParams = useMemo(() => {
    const params = { page, limit: PAGE_SIZE };
    if (debouncedSearch) params.search = debouncedSearch;
    if (roleFilter !== 'all') params.role_id = Number(roleFilter);
    if (statusFilter === 'true') params.is_active = true;
    if (statusFilter === 'false') params.is_active = false;
    return params;
  }, [debouncedSearch, roleFilter, statusFilter, page]);

  const { data, isLoading, isError, error, refetch } = useAdminStaffListQuery(queryParams);
  const { data: roles } = useAdminRolesQuery();

  const activateMutation = useActivateStaffMutation();
  const deleteMutation = useDeleteStaffMutation();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState('delete');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const staff = data?.staff ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openDeleteConfirm = (member) => {
    setSelectedStaff(member);
    setConfirmMode('delete');
    setConfirmOpen(true);
  };

  const openActivateConfirm = (member) => {
    setSelectedStaff(member);
    setConfirmMode('activate');
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedStaff) return;
    try {
      if (confirmMode === 'delete') {
        await deleteMutation.mutateAsync({ id: selectedStaff.id });
        toast.success('Staff member deleted successfully');
      } else {
        await activateMutation.mutateAsync({
          id: selectedStaff.id,
          is_active: !selectedStaff.is_active,
        });
        toast.success(
          `Staff member ${selectedStaff.is_active ? 'deactivated' : 'activated'} successfully`
        );
      }
    } catch (err) {
      toast.error(err?.message || 'Action failed');
    } finally {
      setConfirmOpen(false);
      setSelectedStaff(null);
    }
  };

  return (
    <AdminLayout pageTitle="Staff" compact>
      <div className="admin-page">
        <header className="admin-page__head admin-page__head--row">
          <div>
            <h1 className="admin-page__title">Staff Management</h1>
            <p className="admin-page__subtitle">Manage hospital staff, roles, and access.</p>
          </div>
          <Button onClick={() => navigate(ROUTES.ADMIN_STAFF_NEW)}>
            <Plus size={16} aria-hidden />
            Add Staff
          </Button>
        </header>

        <div className="admin-card">
          <div className="admin-card__body">
            <div className="admin-toolbar">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search by name or email…"
              />
              <div className="admin-toolbar__filters">
                <Select
                  value={roleFilter}
                  onChange={setRoleFilter}
                  options={[
                    { value: 'all', label: 'All roles' },
                    ...(roles?.map((role) => ({
                      value: String(role.id),
                      label: formatRoleLabel(role.name),
                    })) ?? []),
                  ]}
                />
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: 'all', label: 'All status' },
                    { value: 'true', label: 'Active' },
                    { value: 'false', label: 'Inactive' },
                  ]}
                />
              </div>
            </div>

            <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
              {staff.length === 0 ? (
                <div className="admin-empty">No staff members found matching your criteria.</div>
              ) : (
                <>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Department</th>
                          <th>Status</th>
                          <th className="admin-table__actions">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staff.map((member) => {
                          const isSelf = Number(currentUserId) === Number(member.id);
                          const fullName = `${member.first_name} ${member.last_name || ''}`.trim();
                          return (
                            <tr key={member.id}>
                              <td className="admin-role-name">{fullName}</td>
                              <td>{member.email}</td>
                              <td className="admin-role-name">{formatRoleLabel(member.role_name)}</td>
                              <td>{member.department_name || '—'}</td>
                              <td>
                                <AdminStaffStatusBadge isActive={member.is_active} />
                              </td>
                              <td className="admin-table__actions">
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setOpenMenuId((prev) => (prev === member.id ? null : member.id))
                                    }
                                    aria-label={`Actions for ${fullName}`}
                                  >
                                    <MoreHorizontal size={16} />
                                  </Button>
                                  {openMenuId === member.id && (
                                    <div
                                      className="admin-card"
                                      style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: '100%',
                                        zIndex: 20,
                                        minWidth: '11rem',
                                        padding: '0.35rem',
                                      }}
                                    >
                                      <button
                                        type="button"
                                        className="admin-menu-item"
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          navigate(`/admin/staff/${member.id}`);
                                        }}
                                      >
                                        <Eye size={14} /> View
                                      </button>
                                      <button
                                        type="button"
                                        className="admin-menu-item"
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          navigate(`/admin/staff/${member.id}?edit=1`);
                                        }}
                                      >
                                        <Pencil size={14} /> Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="admin-menu-item"
                                        disabled={isSelf}
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          openActivateConfirm(member);
                                        }}
                                      >
                                        {member.is_active ? (
                                          <>
                                            <UserX size={14} /> Deactivate
                                          </>
                                        ) : (
                                          <>
                                            <UserCheck size={14} /> Activate
                                          </>
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        className="admin-menu-item admin-menu-item--danger"
                                        disabled={isSelf}
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          openDeleteConfirm(member);
                                        }}
                                      >
                                        <Trash2 size={14} /> Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <TablePagination
                    page={page}
                    totalPages={totalPages}
                    totalItems={total}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPage}
                  />
                </>
              )}
            </QueryFeedback>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={
          confirmMode === 'delete'
            ? 'Delete staff member'
            : `${selectedStaff?.is_active ? 'Deactivate' : 'Activate'} staff member`
        }
        message={
          confirmMode === 'delete'
            ? `Are you sure you want to delete ${selectedStaff?.first_name ?? 'this user'}?`
            : `Are you sure you want to ${selectedStaff?.is_active ? 'deactivate' : 'activate'} ${selectedStaff?.first_name ?? 'this user'}?`
        }
        confirmLabel={confirmMode === 'delete' ? 'Delete' : 'Confirm'}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </AdminLayout>
  );
}
