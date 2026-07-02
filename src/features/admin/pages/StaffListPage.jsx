import { useEffect, useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { Eye, MoreHorizontal, Pencil, Plus, RotateCcw, Search, Trash2, UserCheck, UserX } from 'lucide-react';

import AdminLayout from '@/features/admin/components/AdminLayout';

import AdminEmptyState from '@/features/admin/components/AdminEmptyState';

import AdminPageHeader from '@/features/admin/components/AdminPageHeader';

import AdminRoleBadge from '@/features/admin/components/AdminRoleBadge';

import AdminStaffStatusBadge from '@/features/admin/components/AdminStaffStatusBadge';

import AdminUserCell from '@/features/admin/components/AdminUserCell';

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

  const hasActiveFilters =

    Boolean(search.trim()) || roleFilter !== 'all' || statusFilter !== 'all';



  const roleOptions = useMemo(

    () => [

      { value: 'all', label: 'All roles' },

      ...(roles?.map((role) => ({

        value: String(role.id),

        label: role.name === 'opd_billing' ? 'OPD Billing' : role.name.replace(/_/g, ' '),

      })) ?? []),

    ],

    [roles]

  );



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



  const resetFilters = () => {

    setSearch('');

    setRoleFilter('all');

    setStatusFilter('all');

    setPage(1);

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

        <AdminPageHeader

          eyebrow="People"

          title="Staff management"

          subtitle="Search, filter, and manage hospital staff accounts, roles, and access."

          actions={(

            <Button onClick={() => navigate(ROUTES.ADMIN_STAFF_NEW)}>

              <Plus size={16} aria-hidden />

              Add staff

            </Button>

          )}

        />



        <div className="admin-card admin-card--flat admin-datatable">

          <div className="admin-datatable__toolbar">

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

              options={[

                { value: 'all', label: 'All status' },

                { value: 'true', label: 'Active' },

                { value: 'false', label: 'Inactive' },

              ]}

              placeholder="All status"

            />

            <Button

              type="button"

              variant="outline"

              size="sm"

              className={`admin-toolbar__reset${hasActiveFilters ? ' is-active' : ''}`}

              onClick={resetFilters}

              disabled={!hasActiveFilters}

            >

              <RotateCcw size={14} aria-hidden />

              Reset

            </Button>

          </div>



          {!isLoading && !isError && staff.length > 0 && (

            <div className="admin-datatable__summary">

              <span>

                Showing <strong>{staff.length}</strong> of <strong>{total}</strong> staff

                {hasActiveFilters ? ' (filtered)' : ''}

              </span>

              <span>Page {page} of {totalPages}</span>

            </div>

          )}



          <div className="admin-datatable__body">

            <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>

              {staff.length === 0 ? (

                <AdminEmptyState

                  icon={<Search size={22} />}

                  title="No staff found"

                  description="Try adjusting your search or filters, or register a new staff member."

                />

              ) : (

                <>

                  <div className="admin-table-wrap">

                    <table className="admin-table">

                      <thead>

                        <tr>

                          <th>Staff member</th>

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

                              <td>

                                <AdminUserCell name={fullName} email={member.email} />

                              </td>

                              <td>

                                <AdminRoleBadge roleName={member.role_name} />

                              </td>

                              <td className="admin-table__muted">

                                {member.department_name || '—'}

                              </td>

                              <td>

                                <AdminStaffStatusBadge isActive={member.is_active} />

                              </td>

                              <td className="admin-table__actions">

                                <div className="admin-table__actions-inner">

                                  <Button

                                    variant="ghost"

                                    size="sm"

                                    onClick={() => navigate(`/admin/staff/${member.id}`)}

                                  >

                                    <Eye size={14} aria-hidden />

                                    View

                                  </Button>

                                  <div className="admin-dropdown-wrap">

                                    <Button

                                      variant="ghost"

                                      size="sm"

                                      onClick={() =>

                                        setOpenMenuId((prev) =>

                                          prev === member.id ? null : member.id

                                        )

                                      }

                                      aria-label={`More actions for ${fullName}`}

                                    >

                                      <MoreHorizontal size={16} />

                                    </Button>

                                    {openMenuId === member.id && (

                                      <div className="admin-dropdown admin-card admin-card--flat">

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


