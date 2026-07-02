import { useNavigate } from 'react-router-dom';
import { KeyRound, Link2, ShieldPlus } from 'lucide-react';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader';
import { useAdminRolesQuery } from '@/shared/hooks/queries/useAdminQuery';
import { Button, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';

import AdminRoleBadge from '@/features/admin/components/AdminRoleBadge';

export default function RolesListPage() {
  const navigate = useNavigate();
  const { data: roles, isLoading, isError, error } = useAdminRolesQuery();

  return (
    <AdminLayout pageTitle="Roles">
      <div className="admin-page">
        <AdminPageHeader
          eyebrow="Access control"
          title="System roles"
          subtitle="View roles, create new roles, and manage permissions."
          actions={(
            <>
              <Button variant="outline" onClick={() => navigate(ROUTES.ADMIN_PERMISSIONS_NEW)}>
                <KeyRound size={16} aria-hidden />
                Create permission
              </Button>
              <Button variant="outline" onClick={() => navigate(ROUTES.ADMIN_ROLES_ASSIGN)}>
                <Link2 size={16} aria-hidden />
                Assign permissions
              </Button>
              <Button onClick={() => navigate(ROUTES.ADMIN_ROLES_NEW)}>
                <ShieldPlus size={16} aria-hidden />
                Create role
              </Button>
            </>
          )}
        />

        <div className="admin-card admin-card--flat admin-datatable">
          <div className="admin-datatable__body admin-datatable__body--flush">
            <QueryFeedback isLoading={isLoading} isError={isError} error={error}>
              {!roles?.length ? (
                <AdminEmptyState
                  icon={<ShieldPlus size={22} />}
                  title="No roles found"
                  description="Create a role to begin assigning permissions to staff."
                />
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th className="admin-table__col--md">Role name</th>
                        <th>Permissions</th>
                        <th className="admin-table__actions">Actions</th>
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
                          <td className="admin-table__actions">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigate(`${ROUTES.ADMIN_ROLES_ASSIGN}?role_id=${role.id}`)
                              }
                            >
                              <Link2 size={14} aria-hidden />
                              Assign
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
