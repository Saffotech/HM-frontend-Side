import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldPlus } from 'lucide-react';
import SuperAdminLayout from '@/features/super-admin/components/SuperAdminLayout';
import SuperAdminPageHeader from '@/features/super-admin/components/SuperAdminPageHeader';
import SuperAdminRoleCard from '@/features/super-admin/components/SuperAdminRoleCard';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import { useAdminDashboardQuery, useAdminRolesQuery } from '@/shared/hooks/queries/useAdminQuery';
import { Button, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';

/** Display order for System roles cards (API may return any order). */
const ROLE_CARD_ORDER = [
  'super_admin',
  'admin',
  'receptionist',
  'opd_billing',
  'doctor',
  'ipd',
  'nurse',
  'lab_technician',
  'pharmacist',
];

function roleSortIndex(name) {
  const idx = ROLE_CARD_ORDER.indexOf(String(name || '').toLowerCase());
  return idx === -1 ? ROLE_CARD_ORDER.length + 1 : idx;
}

function buildStaffCounts(staffByRole = []) {
  return staffByRole.reduce((acc, row) => {
    if (row.role_name) acc[row.role_name] = row.count ?? 0;
    return acc;
  }, {});
}

export default function SuperAdminRolesListPage() {
  const navigate = useNavigate();
  const apiQuery = useAdminRolesQuery();
  const dashboardQuery = useAdminDashboardQuery();

  const roles = useMemo(() => {
    const list = apiQuery.data ?? [];
    return [...list].sort((a, b) => {
      const byOrder = roleSortIndex(a.name) - roleSortIndex(b.name);
      if (byOrder !== 0) return byOrder;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }, [apiQuery.data]);

  const staffCounts = useMemo(
    () => buildStaffCounts(dashboardQuery.data?.staff_by_role ?? []),
    [dashboardQuery.data?.staff_by_role],
  );

  const isLoading = apiQuery.isLoading;
  const isError = apiQuery.isError;
  const error = apiQuery.error;
  const permissionsPath = (roleId) =>
    ROUTES.SUPER_ADMIN_ROLES_ASSIGN.replace(':roleId', String(roleId));

  return (
    <SuperAdminLayout pageTitle="Roles">
      <div className="admin-page sa-roles-page">
        <SuperAdminPageHeader
          title="System roles"
          actions={(
            <Button
              size="lg"
              className="sa-roles-create-btn"
              onClick={() => navigate(ROUTES.SUPER_ADMIN_ROLES_NEW)}
            >
              <ShieldPlus size={22} aria-hidden />
              Create role
            </Button>
          )}
        />

        <QueryFeedback
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={() => {
            apiQuery.refetch();
            dashboardQuery.refetch();
          }}
        >
          {!roles?.length ? (
            <div className="admin-card sa-panel-card">
              <AdminEmptyState
                icon={<ShieldPlus size={22} />}
                title="No roles found"
                description="Create a role to begin assigning permissions."
              />
            </div>
          ) : (
            <div className="sa-role-cards-grid">
              {roles.map((role) => (
                <SuperAdminRoleCard
                  key={role.id}
                  role={role}
                  staffCount={staffCounts[role.name] ?? 0}
                  onManage={() => navigate(permissionsPath(role.id))}
                />
              ))}
            </div>
          )}
        </QueryFeedback>
      </div>
    </SuperAdminLayout>
  );
}
