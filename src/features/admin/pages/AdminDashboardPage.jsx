import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BedDouble,
  Building2,
  Plus,
  Shield,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminBarChart from '@/features/admin/components/AdminBarChart';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import AdminQuickAction from '@/features/admin/components/AdminQuickAction';
import AdminRoleBadge, { formatRoleLabel } from '@/features/admin/components/AdminRoleBadge';
import AdminStaffStatusBadge from '@/features/admin/components/AdminStaffStatusBadge';
import AdminStatCard from '@/features/admin/components/AdminStatCard';
import AdminUserCell from '@/features/admin/components/AdminUserCell';
import { useAdminBedAllocationPermissions } from '@/features/admin/hooks/useAdminBedAllocationPermissions';
import {
  useAdminDashboardQuery,
  useAdminDepartmentsQuery,
  useAdminRolesQuery,
  useAdminStaffListQuery,
} from '@/shared/hooks/queries/useAdminQuery';
import { Button, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';

const PREVIEW_LIMIT = 100;

/** Main panel focus: staff (default) | departments | roles */
const FOCUS = {
  STAFF: 'staff',
  DEPARTMENTS: 'departments',
  ROLES: 'roles',
};

function staffListPath({ status, roleId } = {}) {
  const params = new URLSearchParams();
  if (status === true || status === 'true') params.set('status', 'true');
  if (status === false || status === 'false') params.set('status', 'false');
  if (roleId != null && roleId !== '') params.set('role_id', String(roleId));
  const qs = params.toString();
  return qs ? `${ROUTES.ADMIN_STAFF}?${qs}` : ROUTES.ADMIN_STAFF;
}

function buildViewAllLabel({
  focus,
  statusFilter,
  selectedRoleName,
  selectedDepartmentName,
}) {
  if (focus === FOCUS.DEPARTMENTS) {
    if (selectedDepartmentName) return `View ${selectedDepartmentName} staff`;
    return 'View all departments';
  }
  if (focus === FOCUS.ROLES) {
    if (selectedRoleName) return `View ${formatRoleLabel(selectedRoleName)} staff`;
    return 'View all roles';
  }
  const roleLabel = selectedRoleName ? formatRoleLabel(selectedRoleName) : null;
  if (statusFilter === 'true' && roleLabel) return `View active ${roleLabel} staff`;
  if (statusFilter === 'false' && roleLabel) return `View inactive ${roleLabel} staff`;
  if (statusFilter === 'true') return 'View active staff';
  if (statusFilter === 'false') return 'View inactive staff';
  if (roleLabel) return `View ${roleLabel} staff`;
  return 'View all staff';
}

function buildCardCopy({
  focus,
  statusFilter,
  selectedRoleName,
  selectedDepartmentName,
}) {
  if (focus === FOCUS.DEPARTMENTS) {
    if (selectedDepartmentName) {
      return {
        title: `${selectedDepartmentName} staff`,
        desc: `Hospital accounts assigned to the ${selectedDepartmentName} department.`,
      };
    }
    return {
      title: 'Departments',
      desc: 'Active clinical units and assigned staff. Click a department to preview staff.',
    };
  }

  if (focus === FOCUS.ROLES) {
    if (selectedRoleName) {
      const roleLabel = formatRoleLabel(selectedRoleName);
      return {
        title: `${roleLabel} staff`,
        desc: `Accounts currently assigned to the ${roleLabel} role.`,
      };
    }
    return {
      title: 'System roles',
      desc: 'Permission groups in use. Click a role to preview assigned staff.',
    };
  }

  const roleLabel = selectedRoleName ? formatRoleLabel(selectedRoleName) : null;
  if (statusFilter === 'true' && roleLabel) {
    return {
      title: `Active ${roleLabel} staff`,
      desc: `Active accounts assigned to the ${roleLabel} role.`,
    };
  }
  if (statusFilter === 'false' && roleLabel) {
    return {
      title: `Inactive ${roleLabel} staff`,
      desc: `Disabled accounts assigned to the ${roleLabel} role.`,
    };
  }
  if (statusFilter === 'true') {
    return {
      title: 'Active staff by role',
      desc: 'Role distribution for currently active hospital accounts. Click a role to preview staff.',
    };
  }
  if (statusFilter === 'false') {
    return {
      title: 'Inactive staff by role',
      desc: 'Role distribution for disabled hospital accounts. Click a role to preview staff.',
    };
  }
  if (roleLabel) {
    return {
      title: `${roleLabel} staff`,
      desc: `Accounts currently assigned to the ${roleLabel} role.`,
    };
  }
  return {
    title: 'Staff by role',
    desc: 'Headcount distribution across assigned system roles. Click a KPI or role to update this card.',
  };
}

function StaffPreviewList({ items }) {
  if (!items.length) {
    return (
      <AdminEmptyState
        icon={<Users size={22} />}
        title="No staff in this selection"
        description="Try another filter or clear the current selection."
      />
    );
  }

  return (
    <ul className="admin-dashboard-staff-preview">
      {items.map((member) => {
        const fullName = [member.first_name, member.last_name]
          .filter(Boolean)
          .join(' ')
          .trim();
        return (
          <li key={member.id} className="admin-dashboard-staff-preview__item">
            <AdminUserCell
              name={fullName || member.email}
              email={member.email}
              subtitle={
                member.department_name
                  ? `${formatRoleLabel(member.role_name)} · ${member.department_name}`
                  : formatRoleLabel(member.role_name)
              }
            />
            <AdminStaffStatusBadge isActive={member.is_active} />
          </li>
        );
      })}
    </ul>
  );
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useAdminDashboardQuery();
  const { canView: canViewAllocations } = useAdminBedAllocationPermissions();

  const [focus, setFocus] = useState(FOCUS.STAFF);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  const {
    data: departments = [],
    isLoading: departmentsLoading,
    isError: departmentsError,
  } = useAdminDepartmentsQuery(
    { is_active: true },
    { enabled: Boolean(data) && focus === FOCUS.DEPARTMENTS }
  );

  const {
    data: roles = [],
    isLoading: rolesLoading,
    isError: rolesError,
  } = useAdminRolesQuery({
    enabled: Boolean(data) && focus === FOCUS.ROLES,
  });

  const needsStaffQuery =
    focus === FOCUS.STAFF
      ? statusFilter !== 'all' || selectedRole != null
      : focus === FOCUS.DEPARTMENTS ||
        (focus === FOCUS.ROLES && selectedRole != null);

  const previewFilters = useMemo(() => {
    const params = { page: 1, limit: PREVIEW_LIMIT };
    if (focus === FOCUS.STAFF) {
      if (statusFilter === 'true') params.is_active = true;
      if (statusFilter === 'false') params.is_active = false;
      if (selectedRole?.role_id != null) params.role_id = Number(selectedRole.role_id);
    } else if (focus === FOCUS.ROLES && selectedRole?.role_id != null) {
      params.role_id = Number(selectedRole.role_id);
    }
    return params;
  }, [focus, statusFilter, selectedRole]);

  const {
    data: previewData,
    isLoading: previewLoading,
    isError: previewError,
  } = useAdminStaffListQuery(previewFilters, {
    enabled: Boolean(data) && needsStaffQuery,
  });

  const previewItems = previewData?.staff ?? previewData?.items ?? [];

  const departmentStaffPreview = useMemo(() => {
    if (!selectedDepartment) return [];
    const deptId = Number(selectedDepartment.department_id);
    return previewItems.filter((member) => Number(member.department_id) === deptId);
  }, [previewItems, selectedDepartment]);

  const departmentChartItems = useMemo(() => {
    if (focus !== FOCUS.DEPARTMENTS) return [];
    const counts = new Map();
    for (const member of previewItems) {
      const deptId = member.department_id;
      if (deptId == null) continue;
      const existing = counts.get(deptId) || {
        department_id: deptId,
        department_name: member.department_name || `Department ${deptId}`,
        count: 0,
      };
      existing.count += 1;
      if (member.department_name) existing.department_name = member.department_name;
      counts.set(deptId, existing);
    }

    return (departments ?? []).map((dept) => {
      const counted = counts.get(dept.id);
      return {
        department_id: dept.id,
        department_name: dept.name,
        display_name: dept.name,
        count: counted?.count ?? 0,
        code: dept.code,
        is_active: dept.is_active,
      };
    });
  }, [focus, departments, previewItems]);

  const roleChartItems = useMemo(() => {
    if (focus === FOCUS.DEPARTMENTS || focus === FOCUS.ROLES) {
      if (focus === FOCUS.ROLES && !selectedRole) {
        return (data?.staff_by_role ?? []).map((item) => ({
          ...item,
          display_name: formatRoleLabel(item.role_name),
        }));
      }
      return [];
    }

    if (statusFilter === 'all' && !selectedRole) {
      return (data?.staff_by_role ?? [])
        .filter((item) => item.count > 0)
        .map((item) => ({
          ...item,
          display_name: formatRoleLabel(item.role_name),
        }));
    }

    if (selectedRole) return [];

    const counts = new Map();
    for (const member of previewItems) {
      const roleId = member.role_id;
      if (roleId == null) continue;
      const existing = counts.get(roleId) || {
        role_id: roleId,
        role_name: member.role_name,
        count: 0,
      };
      existing.count += 1;
      if (!existing.role_name && member.role_name) existing.role_name = member.role_name;
      counts.set(roleId, existing);
    }

    return Array.from(counts.values())
      .sort((a, b) => String(a.role_name || '').localeCompare(String(b.role_name || '')))
      .map((item) => ({
        ...item,
        display_name: formatRoleLabel(item.role_name),
      }));
  }, [focus, data?.staff_by_role, statusFilter, selectedRole, previewItems]);

  const topRoles = useMemo(
    () =>
      [...(data?.staff_by_role ?? [])]
        .filter((item) => item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    [data?.staff_by_role]
  );

  const cardCopy = buildCardCopy({
    focus,
    statusFilter,
    selectedRoleName: selectedRole?.role_name,
    selectedDepartmentName: selectedDepartment?.department_name,
  });
  const viewAllLabel = buildViewAllLabel({
    focus,
    statusFilter,
    selectedRoleName: selectedRole?.role_name,
    selectedDepartmentName: selectedDepartment?.department_name,
  });

  const selectStatus = (next) => {
    setFocus(FOCUS.STAFF);
    setSelectedDepartment(null);
    setSelectedRole(null);
    setStatusFilter((current) => (current === next ? 'all' : next));
  };

  const selectDepartmentsFocus = () => {
    setFocus((current) => {
      if (current === FOCUS.DEPARTMENTS) {
        setSelectedDepartment(null);
        return FOCUS.STAFF;
      }
      setStatusFilter('all');
      setSelectedRole(null);
      setSelectedDepartment(null);
      return FOCUS.DEPARTMENTS;
    });
  };

  const selectRolesFocus = () => {
    setFocus((current) => {
      if (current === FOCUS.ROLES) {
        setSelectedRole(null);
        return FOCUS.STAFF;
      }
      setStatusFilter('all');
      setSelectedDepartment(null);
      setSelectedRole(null);
      return FOCUS.ROLES;
    });
  };

  const selectRole = (item) => {
    if (item?.role_id == null) return;
    const nextId = Number(item.role_id);
    setSelectedDepartment(null);
    setSelectedRole((current) =>
      current != null && Number(current.role_id) === nextId
        ? null
        : { role_id: nextId, role_name: item.role_name }
    );
  };

  const selectDepartment = (item) => {
    if (item?.department_id == null) return;
    const nextId = Number(item.department_id);
    setSelectedRole(null);
    setSelectedDepartment((current) =>
      current != null && Number(current.department_id) === nextId
        ? null
        : {
            department_id: nextId,
            department_name: item.department_name || item.display_name,
          }
    );
  };

  const clearSelection = () => {
    setFocus(FOCUS.STAFF);
    setStatusFilter('all');
    setSelectedRole(null);
    setSelectedDepartment(null);
  };

  const openPrimaryAction = () => {
    if (focus === FOCUS.DEPARTMENTS) {
      if (selectedDepartment) {
        navigate(staffListPath());
        return;
      }
      navigate(ROUTES.ADMIN_DEPARTMENTS);
      return;
    }
    if (focus === FOCUS.ROLES) {
      if (selectedRole) {
        navigate(staffListPath({ roleId: selectedRole.role_id }));
        return;
      }
      navigate(ROUTES.ADMIN_ROLES);
      return;
    }
    navigate(
      staffListPath({
        status: statusFilter === 'all' ? undefined : statusFilter,
        roleId: selectedRole?.role_id,
      })
    );
  };

  const hasActiveFilter =
    focus !== FOCUS.STAFF ||
    statusFilter !== 'all' ||
    selectedRole != null ||
    selectedDepartment != null;

  const showStaffPreview =
    (focus === FOCUS.STAFF && Boolean(selectedRole)) ||
    (focus === FOCUS.ROLES && Boolean(selectedRole)) ||
    (focus === FOCUS.DEPARTMENTS && Boolean(selectedDepartment));

  const staffPreviewSource =
    focus === FOCUS.DEPARTMENTS ? departmentStaffPreview : previewItems;

  const showChart = !showStaffPreview;

  const panelLoading =
    (focus === FOCUS.DEPARTMENTS && (departmentsLoading || previewLoading)) ||
    (focus === FOCUS.ROLES && (rolesLoading || (selectedRole && previewLoading))) ||
    (focus === FOCUS.STAFF && needsStaffQuery && previewLoading);

  const panelError =
    (focus === FOCUS.DEPARTMENTS && (departmentsError || previewError)) ||
    (focus === FOCUS.ROLES && (rolesError || (selectedRole && previewError))) ||
    (focus === FOCUS.STAFF && needsStaffQuery && previewError);

  return (
    <AdminLayout pageTitle="Dashboard">
      <div className="admin-page admin-page--dashboard">
        <QueryFeedback
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={refetch}
        >
          {data && (
            <>
              <div className="admin-stats admin-stats--dashboard">
                <AdminStatCard
                  title="Active staff"
                  value={data.active_staff}
                  subtitle={`${data.total_staff ? Math.round((data.active_staff / data.total_staff) * 100) : 0}% of total`}
                  icon={<UserCheck size={18} />}
                  isLoading={isLoading}
                  tone="success"
                  isActive={focus === FOCUS.STAFF && statusFilter === 'true'}
                  onClick={() => selectStatus('true')}
                />
                <AdminStatCard
                  title="Inactive staff"
                  value={data.inactive_staff}
                  subtitle="Accounts disabled"
                  icon={<UserX size={18} />}
                  isLoading={isLoading}
                  tone="neutral"
                  isActive={focus === FOCUS.STAFF && statusFilter === 'false'}
                  onClick={() => selectStatus('false')}
                />
                <AdminStatCard
                  title="Departments"
                  value={data.total_departments}
                  subtitle="Active clinical units"
                  icon={<Building2 size={18} />}
                  isLoading={isLoading}
                  tone="info"
                  isActive={focus === FOCUS.DEPARTMENTS}
                  onClick={selectDepartmentsFocus}
                />
                <AdminStatCard
                  title="System roles"
                  value={data.total_roles}
                  subtitle="Permission groups"
                  icon={<Shield size={18} />}
                  isLoading={isLoading}
                  tone="warning"
                  isActive={focus === FOCUS.ROLES}
                  onClick={selectRolesFocus}
                />
              </div>

              <div className="admin-dashboard-grid">
                <div className="admin-card admin-card--flat admin-dashboard-panel">
                  <div className="admin-card__header admin-card__header--row">
                    <div>
                      <h2 className="admin-card__title">{cardCopy.title}</h2>
                      <p className="admin-card__desc">{cardCopy.desc}</p>
                    </div>
                    <div className="admin-dashboard-panel__actions">
                      {hasActiveFilter ? (
                        <Button variant="ghost" size="sm" onClick={clearSelection}>
                          Clear filter
                        </Button>
                      ) : null}
                      <Button variant="outline" size="sm" onClick={openPrimaryAction}>
                        {focus === FOCUS.DEPARTMENTS && !selectedDepartment ? (
                          <Building2 size={14} aria-hidden />
                        ) : focus === FOCUS.ROLES && !selectedRole ? (
                          <Shield size={14} aria-hidden />
                        ) : (
                          <Users size={14} aria-hidden />
                        )}
                        {viewAllLabel}
                      </Button>
                    </div>
                  </div>
                  <div className="admin-card__body">
                    {panelLoading ? (
                      <div className="admin-dashboard-preview-loading">Loading…</div>
                    ) : panelError ? (
                      <AdminEmptyState
                        icon={<Users size={22} />}
                        title="Could not load data"
                        description="Try clearing the filter or open the full list."
                      />
                    ) : showStaffPreview ? (
                      <StaffPreviewList items={staffPreviewSource} />
                    ) : showChart && focus === FOCUS.DEPARTMENTS ? (
                      departmentChartItems.length ? (
                        <AdminBarChart
                          items={departmentChartItems}
                          labelKey="display_name"
                          valueKey="count"
                          scale="total"
                          selectedKey={selectedDepartment?.department_id}
                          getItemKey={(item) => item.department_id}
                          onItemClick={selectDepartment}
                          formatValue={(value, item, { total }) => {
                            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${value} staff (${pct}%)`;
                          }}
                        />
                      ) : (
                        <AdminEmptyState
                          icon={<Building2 size={22} />}
                          title="No departments found"
                          description="Active departments will appear here once configured."
                        />
                      )
                    ) : showChart && focus === FOCUS.ROLES ? (
                      <>
                        {roleChartItems.length ? (
                          <AdminBarChart
                            items={roleChartItems}
                            labelKey="display_name"
                            valueKey="count"
                            scale="total"
                            selectedKey={selectedRole?.role_id}
                            onItemClick={selectRole}
                            formatValue={(value, item, { total }) => {
                              const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                              return `${value} staff (${pct}%)`;
                            }}
                          />
                        ) : null}
                        {roles?.length ? (
                          <div className="admin-role-breakdown">
                            {roles.map((role) => (
                              <button
                                key={role.id}
                                type="button"
                                className={`admin-role-breakdown__item admin-role-breakdown__item--clickable${
                                  selectedRole && Number(selectedRole.role_id) === Number(role.id)
                                    ? ' is-selected'
                                    : ''
                                }`}
                                onClick={() =>
                                  selectRole({ role_id: role.id, role_name: role.name })
                                }
                              >
                                <AdminRoleBadge roleName={role.name} />
                                <span className="admin-role-breakdown__count">
                                  {role.permissions?.length ?? 0} perms
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </>
                    ) : showChart && roleChartItems.length ? (
                      <AdminBarChart
                        items={roleChartItems}
                        labelKey="display_name"
                        valueKey="count"
                        scale="total"
                        selectedKey={selectedRole?.role_id}
                        onItemClick={selectRole}
                        formatValue={(value, item, { total }) => {
                          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                          return `${value} staff (${pct}%)`;
                        }}
                      />
                    ) : (
                      <AdminEmptyState
                        icon={<Users size={22} />}
                        title="No data for this filter"
                        description="Try another card or clear the current selection."
                      />
                    )}
                  </div>
                </div>

                <aside className="admin-dashboard-side">
                  <div className="admin-card admin-card--flat admin-dashboard-panel">
                    <div className="admin-card__header">
                      <h2 className="admin-card__title">Quick actions</h2>
                      <p className="admin-card__desc">Common administration tasks.</p>
                    </div>
                    <div className="admin-card__body admin-quick-actions">
                      <AdminQuickAction
                        to={ROUTES.ADMIN_STAFF}
                        icon={<Users size={18} />}
                        title="Manage staff"
                        description="Search, edit, and activate accounts"
                        tone="primary"
                      />
                      <AdminQuickAction
                        to={ROUTES.ADMIN_STAFF_NEW}
                        icon={<Plus size={18} />}
                        title="Register staff"
                        description="Create a new hospital account"
                        tone="success"
                      />
                      <AdminQuickAction
                        to={ROUTES.ADMIN_REPORTS}
                        icon={<BarChart3 size={18} />}
                        title="Reports"
                        description="Visits, revenue, and analytics"
                        tone="neutral"
                      />
                      {canViewAllocations && (
                        <AdminQuickAction
                          to={ROUTES.ADMIN_BED_ALLOCATION}
                          icon={<BedDouble size={18} />}
                          title="Bed allocation"
                          description="Assign nurse shift beds"
                          tone="primary"
                        />
                      )}
                    </div>
                  </div>

                  <div className="admin-card admin-card--flat admin-dashboard-summary">
                    <div className="admin-card__body">
                      <button
                        type="button"
                        className={`admin-dashboard-summary__row admin-dashboard-summary__row--clickable${
                          focus === FOCUS.STAFF && statusFilter === 'all' && !selectedRole
                            ? ' admin-dashboard-summary__row--active'
                            : ''
                        }`}
                        onClick={clearSelection}
                      >
                        <span className="admin-dashboard-summary__label">Total staff</span>
                        <span className="admin-dashboard-summary__value">{data.total_staff}</span>
                      </button>
                      <button
                        type="button"
                        className={`admin-dashboard-summary__row admin-dashboard-summary__row--clickable${
                          focus === FOCUS.ROLES ? ' admin-dashboard-summary__row--active' : ''
                        }`}
                        onClick={selectRolesFocus}
                      >
                        <span className="admin-dashboard-summary__label">Roles in use</span>
                        <span className="admin-dashboard-summary__value">
                          {data.staff_by_role?.filter((r) => r.count > 0).length ?? 0}
                        </span>
                      </button>
                      <button
                        type="button"
                        className={`admin-dashboard-summary__row admin-dashboard-summary__row--clickable${
                          topRoles[0] &&
                          selectedRole &&
                          Number(selectedRole.role_id) === Number(topRoles[0].role_id)
                            ? ' admin-dashboard-summary__row--active'
                            : ''
                        }`}
                        onClick={() => {
                          setFocus(FOCUS.STAFF);
                          setStatusFilter('all');
                          setSelectedDepartment(null);
                          if (topRoles[0]) selectRole(topRoles[0]);
                        }}
                        disabled={!topRoles[0]}
                      >
                        <span className="admin-dashboard-summary__label">Largest role group</span>
                        <span className="admin-dashboard-summary__value">
                          {topRoles[0]
                            ? `${formatRoleLabel(topRoles[0].role_name)} (${topRoles[0].count})`
                            : '—'}
                        </span>
                      </button>
                    </div>
                  </div>
                </aside>
              </div>
            </>
          )}
        </QueryFeedback>
      </div>
    </AdminLayout>
  );
}
