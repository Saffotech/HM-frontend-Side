import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ClipboardList,
  Settings,
  ShieldPlus,
  UserCheck,
  UserPlus,
  Users,
  Shield,
} from 'lucide-react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import ManagerStatCard from '@/features/manager/components/ManagerStatCard';
import ManagerRoleBadge from '@/features/manager/components/ManagerRoleBadge';
import ManagerStaffStatusBadge from '@/features/manager/components/ManagerStaffStatusBadge';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import {
  useAdminDashboardQuery,
  useAdminRolesQuery,
  useAdminStaffListQuery,
} from '@/shared/hooks/queries/useAdminQuery';
import { useAdminAuditQuery } from '@/features/admin/hooks/useAdminQuery';
import { QueryFeedback, SearchBar, TablePagination } from '@/shared/components/common';
import { adminPanelRoutes } from '@/shared/constants';
import { filterHospitalRoleRecords } from '@/features/manager/utils/hospitalManagerRoles';
import { getAuditActionBadgeClass, formatAuditActionLabel } from '@/features/admin/utils/auditActionBadges';
import {
  DASHBOARD_FILTERS,
  DASHBOARD_FILTER_META,
  filterDashboardTableRows,
  getDashboardTableRows,
} from '@/features/admin/utils/adminDashboardFilters';

const PAGE_SIZE = 20;

function quickActions(panel) {
  return [
    {
      to: panel.staffNew,
      icon: UserPlus,
      title: 'Register Staff',
      description: 'Add a new employee',
      tone: 'primary',
    },
    {
      to: panel.rolesNew,
      icon: ShieldPlus,
      title: 'Create Role',
      description: 'Define a new role',
      tone: 'success',
    },
    {
      to: panel.settingsOpd,
      icon: Settings,
      title: 'Settings',
      description: 'Module role permissions',
      tone: 'info',
    },
    {
      to: panel.audit,
      icon: ClipboardList,
      title: 'Audit Log',
      description: 'Full activity history',
      tone: 'warning',
    },
  ];
}

function DashboardTableCell({ column, row }) {
  if (column.key === 'role') {
    return <ManagerRoleBadge roleName={row.role} />;
  }
  if (column.key === 'status') {
    return <ManagerStaffStatusBadge isActive={row.isActive} />;
  }
  if (column.key === 'action') {
    const badgeClass = getAuditActionBadgeClass(row.actionKey);
    return (
      <span className={`admin-badge ${badgeClass}`}>
        {formatAuditActionLabel(row.actionKey)}
      </span>
    );
  }
  return <span>{row[column.key] ?? '—'}</span>;
}

/* Legacy identifier preserved: SuperAdminDashboardPage. Active name: AdminDashboardPage. */
export default function AdminDashboardPage() {
  const { pathname } = useLocation();
  const panel = adminPanelRoutes(pathname);
  const [activeFilter, setActiveFilter] = useState(DASHBOARD_FILTERS.TOTAL_STAFF);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const apiQuery = useAdminDashboardQuery();
  const rolesQuery = useAdminRolesQuery();

  const isStaffTab =
    activeFilter === DASHBOARD_FILTERS.TOTAL_STAFF
    || activeFilter === DASHBOARD_FILTERS.ACTIVE_STAFF;
  const isAuditTab = activeFilter === DASHBOARD_FILTERS.TODAY_EVENTS;
  const isRolesTab = activeFilter === DASHBOARD_FILTERS.TOTAL_ROLES;

  useEffect(() => {
    setPage(1);
  }, [activeFilter, debouncedSearch]);

  const staffListParams = useMemo(() => {
    if (!isStaffTab) return null;
    const params = { page, limit: PAGE_SIZE };
    if (debouncedSearch) params.search = debouncedSearch;
    if (activeFilter === DASHBOARD_FILTERS.ACTIVE_STAFF) params.is_active = true;
    return params;
  }, [activeFilter, debouncedSearch, isStaffTab, page]);

  const staffQuery = useAdminStaffListQuery(
    staffListParams ?? { page: 1, limit: 1 },
    { enabled: isStaffTab },
  );

  const auditListParams = useMemo(() => {
    if (!isAuditTab) return null;
    return {
      dateFrom: today,
      dateTo: today,
      actor: debouncedSearch || undefined,
      page,
      limit: PAGE_SIZE,
    };
  }, [debouncedSearch, isAuditTab, page, today]);

  const auditQuery = useAdminAuditQuery(
    auditListParams ?? { page: 1, limit: 1 },
    { enabled: isAuditTab },
  );

  const todayAuditCountQuery = useAdminAuditQuery(
    { dateFrom: today, dateTo: today, page: 1, limit: 1 },
    { enabled: true },
  );

  const data = apiQuery.data;
  const staff = useMemo(() => staffQuery.data?.staff ?? [], [staffQuery.data?.staff]);
  const staffTotal = staffQuery.data?.total ?? 0;
  const staffTotalPages = Math.max(1, Math.ceil(staffTotal / PAGE_SIZE));
  const roles = useMemo(
    () => filterHospitalRoleRecords(rolesQuery.data ?? []),
    [rolesQuery.data],
  );
  const auditLogs = useMemo(
    () => auditQuery.data?.entries ?? [],
    [auditQuery.data?.entries],
  );
  const auditTotal = auditQuery.data?.total ?? 0;
  const auditTotalPages = Math.max(1, Math.ceil(auditTotal / PAGE_SIZE));
  const todayEventsTotal = todayAuditCountQuery.data?.total ?? 0;

  const isLoading = apiQuery.isLoading || rolesQuery.isLoading;
  const isError = apiQuery.isError || rolesQuery.isError;
  const error = apiQuery.error || rolesQuery.error;

  const refetch = useCallback(() => {
    apiQuery.refetch();
    rolesQuery.refetch();
    if (isStaffTab) staffQuery.refetch();
    if (isAuditTab) auditQuery.refetch();
    todayAuditCountQuery.refetch();
  }, [apiQuery, rolesQuery, staffQuery, auditQuery, todayAuditCountQuery, isStaffTab, isAuditTab]);

  useEffect(() => {
    setSearchQuery('');
    setPage(1);
  }, [activeFilter]);

  const stats = useMemo(
    () => [
      {
        key: DASHBOARD_FILTERS.TOTAL_STAFF,
        label: 'Total Staff',
        value: data?.total_staff ?? '—',
        sub: 'Registered employees',
        tone: 'primary',
        icon: <Users size={18} />,
      },
      {
        key: DASHBOARD_FILTERS.ACTIVE_STAFF,
        label: 'Active Staff',
        value: data?.active_staff ?? '—',
        sub: data?.inactive_staff != null
          ? `${data.inactive_staff} inactive`
          : 'Currently active',
        tone: 'success',
        icon: <UserCheck size={18} />,
      },
      {
        key: DASHBOARD_FILTERS.TOTAL_ROLES,
        label: 'Total Roles',
        value: rolesQuery.isLoading ? '—' : roles.length,
        sub: 'Defined role types',
        tone: 'warning',
        icon: <Shield size={18} />,
      },
      {
        key: DASHBOARD_FILTERS.TODAY_EVENTS,
        label: "Today's Events",
        value: todayEventsTotal ?? '—',
        sub: 'Audit log entries today',
        tone: 'info',
        icon: <ClipboardList size={18} />,
      },
    ],
    [data, roles.length, rolesQuery.isLoading, todayEventsTotal],
  );

  const tableMeta = DASHBOARD_FILTER_META[activeFilter];
  const tableRows = useMemo(
    () =>
      getDashboardTableRows(activeFilter, {
        staff,
        roles,
        auditLogs,
        staffByRole: data?.staff_by_role ?? [],
      }),
    [activeFilter, auditLogs, data?.staff_by_role, roles, staff],
  );

  const displayRows = useMemo(() => {
    if (isRolesTab) return filterDashboardTableRows(tableRows, searchQuery);
    return tableRows;
  }, [isRolesTab, searchQuery, tableRows]);

  const tableLoading =
    (isStaffTab && staffQuery.isLoading)
    || (isAuditTab && auditQuery.isLoading)
    || (isRolesTab && rolesQuery.isLoading);

  const paginationProps = useMemo(() => {
    if (isStaffTab) {
      return {
        page,
        totalPages: staffTotalPages,
        totalItems: staffTotal,
        pageSize: PAGE_SIZE,
        onPageChange: setPage,
        itemLabel: 'staff',
      };
    }
    if (isAuditTab) {
      return {
        page,
        totalPages: auditTotalPages,
        totalItems: auditTotal,
        pageSize: PAGE_SIZE,
        onPageChange: setPage,
        itemLabel: 'events',
      };
    }
    return null;
  }, [
    auditTotal,
    auditTotalPages,
    isAuditTab,
    isStaffTab,
    page,
    staffTotal,
    staffTotalPages,
  ]);

  return (
    <AdminLayout pageTitle="Admin">
      <div className="admin-page admin-page--dashboard">
        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
          <div className="admin-stats admin-stats--dashboard admin-panel-dashboard-stats">
            {stats.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`admin-panel-dashboard-stat-btn${activeFilter === s.key ? ' admin-panel-dashboard-stat-btn--active' : ''}`}
                onClick={() => setActiveFilter(s.key)}
                aria-pressed={activeFilter === s.key}
              >
                <ManagerStatCard
                  title={s.label}
                  value={s.value}
                  subtitle={s.sub}
                  icon={s.icon}
                  tone={s.tone}
                  isLoading={isLoading && s.key !== DASHBOARD_FILTERS.TODAY_EVENTS}
                />
              </button>
            ))}
          </div>

          <div className="admin-detail-grid admin-panel-dashboard-grid">
            <div className="admin-card admin-panel-panel-card admin-panel-dashboard-table-card">
              <div className="admin-card__body admin-panel-dashboard-table-body">
                <SearchBar
                  className="admin-panel-dashboard-table-search"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={tableMeta.searchPlaceholder}
                />
                {tableLoading ? (
                  <div className="admin-empty-state"><p>Loading records…</p></div>
                ) : !tableRows.length ? (
                  <div className="admin-empty-state"><p>{tableMeta.emptyMessage}</p></div>
                ) : !displayRows.length ? (
                  <div className="admin-empty-state"><p>{tableMeta.noResultsMessage}</p></div>
                ) : (
                  <>
                    <div className="admin-table-wrap admin-panel-dashboard-table-wrap">
                      <table className="admin-table admin-table--stack">
                        <thead>
                          <tr>
                            {tableMeta.columns.map((col) => (
                              <th key={col.key}>{col.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {displayRows.map((row) => (
                            <tr key={row.id}>
                              {tableMeta.columns.map((col) => (
                                <td key={col.key} data-label={col.label}>
                                  <DashboardTableCell column={col} row={row} />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {paginationProps ? (
                      <TablePagination {...paginationProps} />
                    ) : null}
                  </>
                )}
              </div>
            </div>

            <div className="admin-card admin-panel-panel-card admin-panel-dashboard-quick-card">
              <div className="admin-card__header">
                <h2 className="admin-card__title">Quick Actions</h2>
              </div>
              <div className="admin-card__body admin-panel-dashboard-quick-body">
                <div className="admin-panel-dashboard-quick-actions">
                  {quickActions(panel).map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link
                        key={action.to}
                        to={action.to}
                        className={`admin-quick-action admin-quick-action--${action.tone} admin-panel-dashboard-quick-action`}
                      >
                        <div className="admin-quick-action__icon" aria-hidden>
                          <Icon size={20} />
                        </div>
                        <div className="admin-quick-action__text">
                          <span className="admin-quick-action__title">{action.title}</span>
                          <span className="admin-quick-action__desc">{action.description}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </QueryFeedback>
      </div>
    </AdminLayout>
  );
}
