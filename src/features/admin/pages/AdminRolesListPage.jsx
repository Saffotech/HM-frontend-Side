import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldPlus } from 'lucide-react';
import SuperAdminLayout from '@/features/admin/components/AdminLayout';
import SuperAdminPageHeader from '@/features/admin/components/AdminPageHeader';
import SuperAdminRoleCard from '@/features/admin/components/AdminRoleCard';
import AdminEmptyState from '@/features/manager/components/ManagerEmptyState';
import { useAdminDashboardQuery, useAdminRolesQuery } from '@/shared/hooks/queries/useAdminQuery';
import { QueryFeedback } from '@/shared/components/common';
import { adminPanelRoutes } from '@/shared/constants';
import { filterHospitalRoleRecords } from '@/features/manager/utils/hospitalManagerRoles';

/** Display order for System roles cards (API may return any order). */
const ROLE_CARD_ORDER = [
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
  const { pathname } = useLocation();
  const panel = adminPanelRoutes(pathname);
  const apiQuery = useAdminRolesQuery();
  const dashboardQuery = useAdminDashboardQuery();

  const roles = useMemo(() => {
    const list = filterHospitalRoleRecords(apiQuery.data ?? []);
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
  const permissionsPath = (roleId) => panel.rolesAssign(roleId);

  return (
    <SuperAdminLayout pageTitle="Roles">
      <div className="admin-page sa-roles-page">
        <SuperAdminPageHeader title="System roles" />

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
