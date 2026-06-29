import {
  Building2,
  Shield,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import { useAdminDashboardQuery } from '@/shared/hooks/queries/useAdminQuery';
import { QueryFeedback, Skeleton } from '@/shared/components/common';

function StatCard({ title, value, icon, isLoading }) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-card__row">
        <span className="admin-stat-card__label">{title}</span>
        {icon}
      </div>
      {isLoading ? (
        <Skeleton height={32} width={48} />
      ) : (
        <div className="admin-stat-card__value">{value ?? '—'}</div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading, isError, error } = useAdminDashboardQuery();

  return (
    <AdminLayout pageTitle="Dashboard">
      <div className="admin-page">
        <header className="admin-page__head">
          <h1 className="admin-page__title">Overview</h1>
          <p className="admin-page__subtitle">High-level statistics for hospital staff.</p>
        </header>

        <QueryFeedback isLoading={isLoading} isError={isError} error={error}>
          <div className="admin-stats">
            <StatCard
              title="Total Staff"
              value={data?.total_staff}
              icon={<Users size={16} color="#64748b" aria-hidden />}
              isLoading={isLoading}
            />
            <StatCard
              title="Active"
              value={data?.active_staff}
              icon={<UserCheck size={16} color="#059669" aria-hidden />}
              isLoading={isLoading}
            />
            <StatCard
              title="Inactive"
              value={data?.inactive_staff}
              icon={<UserX size={16} color="#94a3b8" aria-hidden />}
              isLoading={isLoading}
            />
            <StatCard
              title="Departments"
              value={data?.total_departments}
              icon={<Building2 size={16} color="#0d9488" aria-hidden />}
              isLoading={isLoading}
            />
            <StatCard
              title="Roles"
              value={data?.total_roles}
              icon={<Shield size={16} color="#475569" aria-hidden />}
              isLoading={isLoading}
            />
          </div>

          <div className="admin-card">
            <div className="admin-card__header">
              <h2 className="admin-card__title">Staff by Role</h2>
            </div>
            <div className="admin-card__body">
              {data?.staff_by_role?.length ? (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Role</th>
                        <th style={{ textAlign: 'right' }}>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.staff_by_role.map((item) => (
                        <tr key={item.role_id}>
                          <td className="admin-role-name">{item.role_name}</td>
                          <td style={{ textAlign: 'right' }}>{item.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="admin-empty">No roles data available.</div>
              )}
            </div>
          </div>
        </QueryFeedback>
      </div>
    </AdminLayout>
  );
}
