import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Eye, Plus, RotateCcw } from 'lucide-react';
import SuperAdminLayout from '@/features/super-admin/components/SuperAdminLayout';
import SuperAdminPageHeader from '@/features/super-admin/components/SuperAdminPageHeader';
import AdminStaffStatusBadge from '@/features/admin/components/AdminStaffStatusBadge';
import { useDepartmentDoctorsData } from '@/features/super-admin/hooks/useDepartmentDoctors';
import { useAdminDepartmentsQuery } from '@/shared/hooks/queries/useAdminQuery';
import {
  Button,
  QueryFeedback,
  SearchBar,
  Select,
} from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';

export default function SuperAdminDepartmentsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const queryFilters = useMemo(() => {
    if (statusFilter === 'active') return { is_active: true };
    if (statusFilter === 'inactive') return { is_active: false };
    return {};
  }, [statusFilter]);

  const { data: departments, isLoading, isError, error, refetch } =
    useAdminDepartmentsQuery(queryFilters);

  const {
    doctorCountByDepartment,
    isLoading: doctorsLoading,
    isError: doctorsError,
    error: doctorsErrorObj,
    refetch: refetchDoctors,
  } = useDepartmentDoctorsData();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return departments ?? [];
    return (departments ?? []).filter(
      (dept) =>
        dept.name?.toLowerCase().includes(term)
        || (dept.code || '').toLowerCase().includes(term),
    );
  }, [departments, search]);

  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== 'all';
  const tableLoading = isLoading || doctorsLoading;
  const tableError = isError || doctorsError;
  const tableErrorObj = error || doctorsErrorObj;

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
  };

  const handleRetry = () => {
    refetch();
    refetchDoctors();
  };

  return (
    <SuperAdminLayout pageTitle="Departments">
      <div className="admin-page sa-dept-list-page">
        <SuperAdminPageHeader
          title="Departments"
          actions={(
            <Button onClick={() => navigate(ROUTES.SUPER_ADMIN_DEPARTMENTS_NEW)}>
              <Plus size={16} aria-hidden />
              New department
            </Button>
          )}
        />

        <div className="admin-card sa-panel-card admin-card--flat admin-datatable">
          <div className="admin-datatable__toolbar admin-datatable__toolbar--2">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search by name or code…"
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'active', label: 'Active only' },
                { value: 'inactive', label: 'Inactive only' },
              ]}
              placeholder="All statuses"
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

          {!tableLoading && !tableError && filtered.length > 0 && (
            <div className="admin-datatable__summary">
              <span>
                Showing <strong>{filtered.length}</strong> department
                {filtered.length === 1 ? '' : 's'}
                {hasActiveFilters ? ' (filtered)' : ''}
              </span>
            </div>
          )}

          <div className="admin-datatable__body">
            <QueryFeedback
              isLoading={tableLoading}
              isError={tableError}
              error={tableErrorObj}
              onRetry={handleRetry}
            >
              {!filtered.length ? (
                <div className="admin-empty-state">
                  <Building2 size={22} aria-hidden />
                  <p>No departments found.</p>
                </div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Code</th>
                        <th>Doctors</th>
                        <th>Status</th>
                        <th className="admin-table__actions">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((dept) => (
                        <tr key={dept.id}>
                          <td className="admin-table__primary">{dept.name}</td>
                          <td className="admin-table__muted">{dept.code || '—'}</td>
                          <td>
                            <span className="sa-dept-list__doctor-count">
                              {doctorCountByDepartment[dept.id] ?? 0}
                            </span>
                          </td>
                          <td>
                            <AdminStaffStatusBadge isActive={dept.is_active} />
                          </td>
                          <td className="admin-table__actions">
                            <button
                              type="button"
                              className="sa-staff-list__action sa-staff-list__action--view"
                              onClick={() =>
                                navigate(
                                  ROUTES.SUPER_ADMIN_DEPARTMENT_DETAIL.replace(':id', dept.id),
                                )
                              }
                            >
                              <Eye size={14} aria-hidden />
                              View
                            </button>
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
      </div>
    </SuperAdminLayout>
  );
}
