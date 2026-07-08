import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  Plus,
  Shield,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminBarChart from '@/features/admin/components/AdminBarChart';
import AdminDashboardHero from '@/features/admin/components/AdminDashboardHero';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import AdminQuickAction from '@/features/admin/components/AdminQuickAction';
import AdminRoleBadge, { formatRoleLabel } from '@/features/admin/components/AdminRoleBadge';
import AdminStatCard from '@/features/admin/components/AdminStatCard';
import { useAdminDashboardQuery } from '@/shared/hooks/queries/useAdminQuery';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useAdminDashboardQuery();

  const greeting = useMemo(() => {
    const name = user?.first_name?.trim() || user?.name?.trim() || 'Admin';
    const hour = new Date().getHours();
    if (hour < 12) return `Good morning, ${name}`;
    if (hour < 17) return `Good afternoon, ${name}`;
    return `Good evening, ${name}`;
  }, [user]);

  const roleChartItems = useMemo(
    () =>
      (data?.staff_by_role ?? []).map((item) => ({
        ...item,
        display_name: formatRoleLabel(item.role_name),
      })),
    [data?.staff_by_role]
  );

  const topRoles = useMemo(
    () =>
      [...(data?.staff_by_role ?? [])]
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    [data?.staff_by_role]
  );

  return (
    <AdminLayout pageTitle="Dashboard">
      <div className="admin-page admin-page--dashboard">
        <AdminDashboardHero
          greeting={greeting}
          totalStaff={data?.total_staff}
          activeStaff={data?.active_staff}
          inactiveStaff={data?.inactive_staff}
          totalDepartments={data?.total_departments}
          isLoading={isLoading}
        />

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
                />
                <AdminStatCard
                  title="Inactive staff"
                  value={data.inactive_staff}
                  subtitle="Accounts disabled"
                  icon={<UserX size={18} />}
                  isLoading={isLoading}
                  tone="neutral"
                />
                <AdminStatCard
                  title="Departments"
                  value={data.total_departments}
                  subtitle="Active clinical units"
                  icon={<Building2 size={18} />}
                  isLoading={isLoading}
                  tone="info"
                />
                <AdminStatCard
                  title="System roles"
                  value={data.total_roles}
                  subtitle="Permission groups"
                  icon={<Shield size={18} />}
                  isLoading={isLoading}
                  tone="warning"
                />
              </div>

              <div className="admin-dashboard-grid">
                <div className="admin-card admin-card--flat admin-dashboard-panel">
                  <div className="admin-card__header admin-card__header--row">
                    <div>
                      <h2 className="admin-card__title">Staff by role</h2>
                      <p className="admin-card__desc">
                        Headcount distribution across assigned system roles.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.ADMIN_STAFF)}>
                      <Users size={14} aria-hidden />
                      View all staff
                    </Button>
                  </div>
                  <div className="admin-card__body">
                    {roleChartItems.length ? (
                      <>
                        <AdminBarChart
                          items={roleChartItems}
                          labelKey="display_name"
                          valueKey="count"
                          scale="total"
                          formatValue={(value, item, { total }) => {
                            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${value} staff (${pct}%)`;
                          }}
                        />
                        <div className="admin-role-breakdown">
                          {topRoles.map((item) => (
                            <div key={item.role_id} className="admin-role-breakdown__item">
                              <AdminRoleBadge roleName={item.role_name} />
                              <span className="admin-role-breakdown__count">{item.count}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <AdminEmptyState
                        icon={<Users size={22} />}
                        title="No role data yet"
                        description="Staff role distribution will appear once users are registered."
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
                    </div>
                  </div>

                  <div className="admin-card admin-card--flat admin-dashboard-summary">
                    <div className="admin-card__body">
                      <div className="admin-dashboard-summary__row">
                        <span className="admin-dashboard-summary__label">Total staff</span>
                        <span className="admin-dashboard-summary__value">{data.total_staff}</span>
                      </div>
                      <div className="admin-dashboard-summary__row">
                        <span className="admin-dashboard-summary__label">Roles in use</span>
                        <span className="admin-dashboard-summary__value">
                          {data.staff_by_role?.filter((r) => r.count > 0).length ?? 0}
                        </span>
                      </div>
                      <div className="admin-dashboard-summary__row">
                        <span className="admin-dashboard-summary__label">Largest role group</span>
                        <span className="admin-dashboard-summary__value">
                          {topRoles[0]
                            ? `${formatRoleLabel(topRoles[0].role_name)} (${topRoles[0].count})`
                            : '—'}
                        </span>
                      </div>
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
