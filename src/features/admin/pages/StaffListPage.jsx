import { useEffect, useMemo, useState } from 'react';

import { useNavigate, useSearchParams } from 'react-router-dom';

import { Eye, Plus, RotateCcw, Search } from 'lucide-react';

import AdminLayout from '@/features/admin/components/AdminLayout';

import AdminEmptyState from '@/features/admin/components/AdminEmptyState';

import AdminPageHeader from '@/features/admin/components/AdminPageHeader';

import AdminRoleBadge from '@/features/admin/components/AdminRoleBadge';

import AdminStaffStatusBadge from '@/features/admin/components/AdminStaffStatusBadge';

import AdminUserCell from '@/features/admin/components/AdminUserCell';

import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

import {

  useAdminRolesQuery,

  useAdminStaffListQuery,

} from '@/shared/hooks/queries/useAdminQuery';

import {

  Button,

  QueryFeedback,

  SearchBar,

  Select,

  TablePagination,

} from '@/shared/components/common';

import { ROUTES } from '@/shared/constants';



const PAGE_SIZE = 10;



function statusFromSearchParams(searchParams) {

  const status = searchParams.get('status');

  if (status === 'true' || status === 'false') return status;

  return 'all';

}



function roleFromSearchParams(searchParams) {

  const roleId = searchParams.get('role_id');

  if (roleId && /^\d+$/.test(roleId)) return roleId;

  return 'all';

}



export default function StaffListPage() {

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();



  const [search, setSearch] = useState('');

  const [roleFilter, setRoleFilter] = useState(() => roleFromSearchParams(searchParams));

  const [statusFilter, setStatusFilter] = useState(() => statusFromSearchParams(searchParams));

  const [page, setPage] = useState(1);



  const debouncedSearch = useDebouncedValue(search.trim(), 300);



  useEffect(() => {

    setRoleFilter(roleFromSearchParams(searchParams));

    setStatusFilter(statusFromSearchParams(searchParams));

    setPage(1);

  }, [searchParams]);



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

        label:
          role.name === 'opd_billing'
            ? 'OPD Billing'
            : role.name === 'ipd'
              ? 'IPD'
              : role.name.replace(/_/g, ' '),

      })) ?? []),

    ],

    [roles]

  );



  const showDepartmentColumn = useMemo(() => {

    if (roleFilter === 'all') return false;

    const selected = roles?.find((role) => String(role.id) === String(roleFilter));

    return selected?.name === 'doctor';

  }, [roleFilter, roles]);



  const resetFilters = () => {

    setSearch('');

    setRoleFilter('all');

    setStatusFilter('all');

    setPage(1);

  };



  return (

    <AdminLayout pageTitle="Staff" compact>

      <div className="admin-page admin-page--compact">

        <AdminPageHeader

          title="Staff management"

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

                          {showDepartmentColumn ? <th>Department</th> : null}

                          <th>Status</th>

                          <th className="admin-table__actions">Actions</th>

                        </tr>

                      </thead>

                      <tbody>

                        {staff.map((member) => {

                          const fullName = `${member.first_name} ${member.last_name || ''}`.trim();

                          return (

                            <tr key={member.id}>

                              <td>

                                <AdminUserCell name={fullName} email={member.email} />

                              </td>

                              <td>

                                <AdminRoleBadge roleName={member.role_name} />

                              </td>

                              {showDepartmentColumn ? (

                                <td className="admin-table__muted">

                                  {member.department_name || '—'}

                                </td>

                              ) : null}

                              <td>

                                <AdminStaffStatusBadge isActive={member.is_active} />

                              </td>

                              <td className="admin-table__actions">

                                <div className="admin-table__actions-inner admin-staff-list__actions">

                                  <button

                                    type="button"

                                    className="admin-staff-list__action admin-staff-list__action--view"

                                    onClick={() => navigate(`/admin/staff/${member.id}`)}

                                  >

                                    <Eye size={14} aria-hidden />

                                    View

                                  </button>

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

    </AdminLayout>

  );

}


