import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Eye, Plus, RotateCcw } from 'lucide-react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader';
import AdminStaffStatusBadge from '@/features/admin/components/AdminStaffStatusBadge';
import { useAdminDepartmentsQuery } from '@/shared/hooks/queries/useAdminQuery';
import {
  Button,
  QueryFeedback,
  SearchBar,
  Select,
} from '@/shared/components/common';
import { isLabOrRadDepartment } from '@/shared/utils/labDepartments';
import { ROUTES } from '@/shared/constants';

export default function DepartmentListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const queryFilters = useMemo(() => {
    if (statusFilter === 'true') return { is_active: true };
    if (statusFilter === 'false') return { is_active: false };
    return {};
  }, [statusFilter]);

  const { data: departments, isLoading, isError, error, refetch } =
    useAdminDepartmentsQuery(queryFilters);

  const filtered = useMemo(() => {
    let rows = departments ?? [];
    if (typeFilter === 'lab') {
      rows = rows.filter((dept) => isLabOrRadDepartment(dept));
    } else if (typeFilter === 'doctor') {
      rows = rows.filter((dept) => !isLabOrRadDepartment(dept));
    }
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (dept) =>
        dept.name?.toLowerCase().includes(term) ||
        (dept.code || '').toLowerCase().includes(term)
    );
  }, [departments, search, typeFilter]);

  const hasActiveFilters =
    Boolean(search.trim()) || typeFilter !== 'all' || statusFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setStatusFilter('all');
  };

  return (
    <AdminLayout pageTitle="Departments">
      <div className="admin-page">
        <AdminPageHeader
          eyebrow="Organization"
          title="Departments"
          subtitle="Manage hospital departments and clinical units."
          actions={(
            <Button onClick={() => navigate(ROUTES.ADMIN_DEPARTMENTS_NEW)}>
              <Plus size={16} aria-hidden />
              New department
            </Button>
          )}
        />

        <div className="admin-card admin-card--flat admin-datatable">
          <div className="admin-datatable__toolbar">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search by name or code…"
            />
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'all', label: 'All types' },
                { value: 'doctor', label: 'Doctor' },
                { value: 'lab', label: 'Lab' },
              ]}
              placeholder="All types"
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'true', label: 'Active only' },
                { value: 'false', label: 'Inactive only' },
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

          {!isLoading && !isError && filtered.length > 0 && (
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
              isLoading={isLoading}
              isError={isError}
              error={error}
              onRetry={refetch}
            >
              {!filtered.length ? (
                <AdminEmptyState
                  icon={<Building2 size={22} />}
                  title="No departments found"
                  description="Create a department or adjust your search and status filters."
                />
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Code</th>
                        <th>Type</th>
                        <th>Description</th>
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
                            {isLabOrRadDepartment(dept) ? (
                              <span className="sa-dept-type sa-dept-type--lab">Lab</span>
                            ) : (
                              <span className="sa-dept-type sa-dept-type--doctor">Doctor</span>
                            )}
                          </td>
                          <td className="admin-table__muted">
                            {dept.description || '—'}
                          </td>
                          <td>
                            <AdminStaffStatusBadge isActive={dept.is_active} />
                          </td>
                          <td className="admin-table__actions">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigate(ROUTES.ADMIN_DEPARTMENT_DETAIL.replace(':id', dept.id))
                              }
                            >
                              <Eye size={14} aria-hidden />
                              View
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
      </div>
    </AdminLayout>
  );
}

