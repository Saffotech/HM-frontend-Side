import AdminLayout from '@/features/admin/components/AdminLayout';
import { useAdminRolesQuery } from '@/shared/hooks/queries/useAdminQuery';
import { QueryFeedback } from '@/shared/components/common';

function formatRoleLabel(name) {
  if (name === 'opd_billing') return 'OPD Billing';
  return name || '—';
}

export default function RolesListPage() {
  const { data: roles, isLoading, isError, error } = useAdminRolesQuery();

  return (
    <AdminLayout pageTitle="Roles">
      <div className="admin-page">
        <header className="admin-page__head">
          <h1 className="admin-page__title">System roles</h1>
          <p className="admin-page__subtitle">
            View roles and permission strings (read-only; matches GET /roles/).
          </p>
        </header>

        <div className="admin-card">
          <div className="admin-card__header">
            <h2 className="admin-card__title">Role permissions</h2>
            <p className="admin-card__desc">Permissions are assigned per role in the backend seed.</p>
          </div>
          <div className="admin-card__body">
            <QueryFeedback isLoading={isLoading} isError={isError} error={error}>
              {!roles?.length ? (
                <div className="admin-empty">No roles found in the system.</div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: '14rem' }}>Role name</th>
                        <th>Permissions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roles.map((role) => (
                        <tr key={role.id}>
                          <td className="admin-role-name">{formatRoleLabel(role.name)}</td>
                          <td>
                            {role.permissions?.length ? (
                              role.permissions.map((perm) => (
                                <span key={perm} className="admin-perm-badge">
                                  {perm}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: '#64748b', fontStyle: 'italic' }}>
                                No permissions
                              </span>
                            )}
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
