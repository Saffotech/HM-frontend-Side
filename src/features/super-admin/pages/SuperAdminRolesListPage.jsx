import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldPlus } from 'lucide-react';
import SuperAdminLayout from '@/features/super-admin/components/SuperAdminLayout';
import SuperAdminPageHeader from '@/features/super-admin/components/SuperAdminPageHeader';
import SuperAdminRoleCard from '@/features/super-admin/components/SuperAdminRoleCard';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import { useAdminRolesQuery, useAdminStaffListQuery } from '@/shared/hooks/queries/useAdminQuery';
import { Button, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { useSuperAdminDemoMode } from '@/features/super-admin/hooks/useSuperAdminDemoMode';
import {
  MOCK_SUPER_ADMIN_ROLES,
  MOCK_SUPER_ADMIN_STAFF,
} from '@/features/super-admin/mock/superAdminMockData';

function buildStaffCounts(staff = []) {
  return staff.reduce((acc, user) => {
    const key = user.role_name || user.role;
    if (key) acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export default function SuperAdminRolesListPage() {
  const navigate = useNavigate();
  const isDemo = useSuperAdminDemoMode();
  const apiQuery = useAdminRolesQuery({ enabled: !isDemo });
  const staffQuery = useAdminStaffListQuery({ page: 1, limit: 100 }, { enabled: !isDemo });

  const roles = isDemo ? MOCK_SUPER_ADMIN_ROLES : apiQuery.data;
  const staff = isDemo ? MOCK_SUPER_ADMIN_STAFF : staffQuery.data?.staff ?? [];
  const staffCounts = useMemo(() => buildStaffCounts(staff), [staff]);

  const isLoading = isDemo ? false : apiQuery.isLoading || staffQuery.isLoading;
  const isError = isDemo ? false : apiQuery.isError || staffQuery.isError;
  const error = apiQuery.error || staffQuery.error;

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
            staffQuery.refetch();
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
