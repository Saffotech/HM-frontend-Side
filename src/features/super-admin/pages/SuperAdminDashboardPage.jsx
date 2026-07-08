import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  Settings,
  ShieldPlus,
  UserCheck,
  UserPlus,
  Users,
  Shield,
} from 'lucide-react';
import SuperAdminLayout from '@/features/super-admin/components/SuperAdminLayout';
import AdminStatCard from '@/features/admin/components/AdminStatCard';
import AdminRoleBadge from '@/features/admin/components/AdminRoleBadge';
import AdminStaffStatusBadge from '@/features/admin/components/AdminStaffStatusBadge';
import { useAdminDashboardQuery, useAdminRolesQuery, useAdminStaffListQuery } from '@/shared/hooks/queries/useAdminQuery';
import { QueryFeedback, SearchBar } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { useSuperAdminDemoMode } from '@/features/super-admin/hooks/useSuperAdminDemoMode';
import {
  getMockTodayAuditLogs,
  MOCK_SUPER_ADMIN_DASHBOARD,
  MOCK_SUPER_ADMIN_ROLES,
  MOCK_SUPER_ADMIN_STAFF,
} from '@/features/super-admin/mock/superAdminMockData';
import { getAuditLogs } from '@/features/super-admin/mock/auditMockService';
import {
  DASHBOARD_FILTERS,
  DASHBOARD_FILTER_META,
  filterDashboardTableRows,
  getDashboardTableRows,
} from '@/features/super-admin/utils/superAdminDashboardFilters';

const ACTION_BADGE = {
  REGISTER_USER: 'admin-badge--info',
  ACTIVATE_USER: 'admin-badge--success',
  DEACTIVATE_USER: 'admin-badge--warn',
  CREATE_ROLE: 'admin-badge--info',
  ASSIGN_PERMISSIONS: 'admin-badge--info',
  UPDATE_SETTINGS: 'admin-badge--warn',
  UPDATE_USER: 'admin-badge--info',
};

const QUICK_ACTIONS = [
  {
    to: ROUTES.SUPER_ADMIN_STAFF_NEW,
    icon: UserPlus,
    title: 'Register Staff',
    description: 'Add a new employee',
    tone: 'primary',
  },
  {
    to: ROUTES.SUPER_ADMIN_ROLES_NEW,
    icon: ShieldPlus,
    title: 'Create Role',
    description: 'Define a new role',
    tone: 'success',
  },
  {
    to: ROUTES.SUPER_ADMIN_SETTINGS,
    icon: Settings,
    title: 'Settings',
    description: 'Hospital configuration',
    tone: 'info',
  },
  {
    to: ROUTES.SUPER_ADMIN_AUDIT,
    icon: ClipboardList,
    title: 'Audit Log',
    description: 'Full activity history',
    tone: 'warning',
  },
];

function DashboardTableCell({ column, row }) {
  if (column.key === 'role') {
    return <AdminRoleBadge role={row.role} />;
  }
  if (column.key === 'status') {
    return <AdminStaffStatusBadge isActive={row.isActive} />;
  }
  if (column.key === 'action') {
    const badgeClass = ACTION_BADGE[row.actionKey] || 'admin-badge--info';
    return <span className={`admin-badge ${badgeClass}`}>{row.action}</span>;
  }
  return row[column.key] ?? '—';
}

export default function SuperAdminDashboardPage() {
  const isDemo = useSuperAdminDemoMode();
  const [activeFilter, setActiveFilter] = useState(DASHBOARD_FILTERS.TOTAL_STAFF);
  const [searchQuery, setSearchQuery] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);

  const apiQuery = useAdminDashboardQuery({ enabled: !isDemo });
  const staffQuery = useAdminStaffListQuery({ page: 1, limit: 100 }, { enabled: !isDemo });
  const rolesQuery = useAdminRolesQuery({ enabled: !isDemo });

  const data = isDemo ? MOCK_SUPER_ADMIN_DASHBOARD : apiQuery.data;
  const staff = isDemo ? MOCK_SUPER_ADMIN_STAFF : staffQuery.data?.staff ?? [];
  const roles = isDemo ? MOCK_SUPER_ADMIN_ROLES : rolesQuery.data ?? [];

  const isLoading = isDemo
    ? false
    : apiQuery.isLoading || staffQuery.isLoading || rolesQuery.isLoading;
  const isError = isDemo ? false : apiQuery.isError || staffQuery.isError || rolesQuery.isError;
  const error = apiQuery.error || staffQuery.error || rolesQuery.error;

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const fetchTodayAudit = useCallback(() => {
    setAuditLoading(true);
    if (isDemo) {
      setAuditLogs(getMockTodayAuditLogs());
      setAuditLoading(false);
      return;
    }
    getAuditLogs({ dateFrom: today, dateTo: today })
      .then(setAuditLogs)
      .catch(() => setAuditLogs([]))
      .finally(() => setAuditLoading(false));
  }, [isDemo, today]);

  const refetch = () => {
    apiQuery.refetch();
    staffQuery.refetch();
    rolesQuery.refetch();
    fetchTodayAudit();
  };

  useEffect(() => {
    fetchTodayAudit();
  }, [fetchTodayAudit]);

  useEffect(() => {
    setSearchQuery('');
  }, [activeFilter]);

  const stats = useMemo(
    () => [
      {
        key: DASHBOARD_FILTERS.TOTAL_STAFF,
        label: 'Total Staff',
        value: data?.total_staff ?? staff.length ?? '—',
        sub: 'Registered employees',
        tone: 'primary',
        icon: <Users size={18} />,
      },
      {
        key: DASHBOARD_FILTERS.ACTIVE_STAFF,
        label: 'Active Staff',
        value: data?.active_staff ?? staff.filter((s) => s.is_active).length ?? '—',
        sub: 'Currently active',
        tone: 'success',
        icon: <UserCheck size={18} />,
      },
      {
        key: DASHBOARD_FILTERS.TOTAL_ROLES,
        label: 'Total Roles',
        value: data?.total_roles ?? roles.length ?? '—',
        sub: 'Defined role types',
        tone: 'warning',
        icon: <Shield size={18} />,
      },
      {
        key: DASHBOARD_FILTERS.TODAY_EVENTS,
        label: "Today's Events",
        value: data?.today_audit ?? auditLogs.length ?? '—',
        sub: 'Audit log entries today',
        tone: 'info',
        icon: <ClipboardList size={18} />,
      },
    ],
    [auditLogs.length, data, roles.length, staff],
  );

  const tableMeta = DASHBOARD_FILTER_META[activeFilter];
  const tableRows = useMemo(
    () => getDashboardTableRows(activeFilter, { staff, roles, auditLogs }),
    [activeFilter, auditLogs, roles, staff],
  );
  const filteredRows = useMemo(
    () => filterDashboardTableRows(tableRows, searchQuery),
    [tableRows, searchQuery],
  );

  const tableLoading = isLoading || (activeFilter === DASHBOARD_FILTERS.TODAY_EVENTS && auditLoading);

  return (
    <SuperAdminLayout pageTitle="SuperAdmin Panel">
      <div className="admin-page admin-page--dashboard">
        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
          <div className="admin-stats admin-stats--dashboard sa-dashboard-stats">
            {stats.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`sa-dashboard-stat-btn${activeFilter === s.key ? ' sa-dashboard-stat-btn--active' : ''}`}
                onClick={() => setActiveFilter(s.key)}
                aria-pressed={activeFilter === s.key}
              >
                <AdminStatCard
                  title={s.label}
                  value={s.value}
                  subtitle={s.sub}
                  icon={s.icon}
                  tone={s.tone}
                  isLoading={isLoading}
                />
              </button>
            ))}
          </div>

          <div className="admin-detail-grid sa-dashboard-grid">
            <div className="admin-card sa-panel-card sa-dashboard-table-card">
              <div className="admin-card__body sa-dashboard-table-body">
                <SearchBar
                  className="sa-dashboard-table-search"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={tableMeta.searchPlaceholder}
                />
                {tableLoading ? (
                  <div className="admin-empty-state"><p>Loading records…</p></div>
                ) : !tableRows.length ? (
                  <div className="admin-empty-state"><p>{tableMeta.emptyMessage}</p></div>
                ) : !filteredRows.length ? (
                  <div className="admin-empty-state"><p>{tableMeta.noResultsMessage}</p></div>
                ) : (
                  <div className="admin-table-wrap sa-dashboard-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          {tableMeta.columns.map((col) => (
                            <th key={col.key}>{col.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((row) => (
                          <tr key={row.id}>
                            {tableMeta.columns.map((col) => (
                              <td key={col.key}>
                                <DashboardTableCell column={col} row={row} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="admin-card sa-panel-card sa-dashboard-quick-card">
              <div className="admin-card__header">
                <h2 className="admin-card__title">Quick Actions</h2>
              </div>
              <div className="admin-card__body sa-dashboard-quick-body">
                <div className="sa-dashboard-quick-actions">
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link
                        key={action.to}
                        to={action.to}
                        className={`admin-quick-action admin-quick-action--${action.tone} sa-dashboard-quick-action`}
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
    </SuperAdminLayout>
  );
}
