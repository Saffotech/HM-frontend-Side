import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader';
import AdminRoleBadge from '@/features/admin/components/AdminRoleBadge';
import { useAdminRolesQuery } from '@/shared/hooks/queries/useAdminQuery';
import { QueryFeedback } from '@/shared/components/common';
import { ShieldPlus } from 'lucide-react';

export default function RolesListPage() {
  const { data: roles, isLoading, isError, error } = useAdminRolesQuery();

  return (
    <AdminLayout pageTitle="Roles">
      <div className="admin-page">
        <AdminPageHeader
          eyebrow="Access control"
          title="System roles"
          subtitle="View role definitions and assigned permissions. Role management is handled by Super Admin."
        />

        <div className="admin-card admin-card--flat admin-datatable">
          <div className="admin-datatable__body admin-datatable__body--flush">
            <QueryFeedback isLoading={isLoading} isError={isError} error={error}>
              {!roles?.length ? (
                <AdminEmptyState
                  icon={<ShieldPlus size={22} />}
                  title="No roles found"
                  description="Roles will appear here once configured in the system."
                />
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th className="admin-table__col--md">Role name</th>
                        <th>Permissions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roles.map((role) => (
                        <tr key={role.id}>
                          <td>
                            <AdminRoleBadge roleName={role.name} />
                          </td>
                          <td>
                            {role.permissions?.length ? (
                              role.permissions.map((perm) => (
                                <span key={perm} className="admin-perm-badge">
                                  {perm}
                                </span>
                              ))
                            ) : (
                              <span className="admin-help-text">No permissions</span>
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
