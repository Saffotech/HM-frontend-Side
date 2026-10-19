import { lazy } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import ProtectedRoute from '@/components/security/ProtectedRoute';
import SuperAdminAppShell from '@/features/admin/components/AdminAppShell';
import { ROUTES, ROLES } from '@/shared/constants';
import LazyRoute from '@/routes/LazyRoute';

const SuperAdminDashboardPage = lazy(() => import('@/features/admin/pages/AdminDashboardPage'));
const SuperAdminStaffListPage = lazy(() => import('@/features/admin/pages/AdminStaffListPage'));
const SuperAdminStaffRegisterPage = lazy(() => import('@/features/admin/pages/AdminStaffRegisterPage'));
const SuperAdminStaffDetailPage = lazy(() => import('@/features/admin/pages/AdminStaffDetailPage'));
const SuperAdminDepartmentCreatePage = lazy(() => import('@/features/admin/pages/AdminDepartmentCreatePage'));
const SuperAdminDepartmentDetailPage = lazy(() => import('@/features/admin/pages/AdminDepartmentDetailPage'));
const SuperAdminDepartmentsListPage = lazy(() => import('@/features/admin/pages/AdminDepartmentsListPage'));
const SuperAdminRolesListPage = lazy(() => import('@/features/admin/pages/AdminRolesListPage'));
const SuperAdminRoleCreatePage = lazy(() => import('@/features/admin/pages/AdminRoleCreatePage'));
const SuperAdminAssignPermissionsPage = lazy(() => import('@/features/admin/pages/AdminAssignPermissionsPage'));
const SuperAdminModuleSettingsPage = lazy(() => import('@/features/admin/pages/AdminModuleSettingsPage'));
const SuperAdminReportsPage = lazy(() => import('@/features/admin/pages/AdminReportsPage'));
const SuperAdminAuditLogPage = lazy(() => import('@/features/admin/pages/AdminAuditLogPage'));
const SuperAdminProfilePage = lazy(() => import('@/features/admin/pages/AdminProfilePage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

const HOSPITAL_ADMIN_PATHS = {
  root: '/admin',
  dashboard: ROUTES.ADMIN_DASHBOARD,
  staff: ROUTES.ADMIN_STAFF,
  staffNew: ROUTES.ADMIN_STAFF_NEW,
  staffDetail: ROUTES.ADMIN_STAFF_DETAIL,
  departments: ROUTES.ADMIN_DEPARTMENTS,
  departmentsNew: ROUTES.ADMIN_DEPARTMENTS_NEW,
  departmentDetail: ROUTES.ADMIN_DEPARTMENT_DETAIL,
  roles: ROUTES.ADMIN_ROLES,
  rolesNew: ROUTES.ADMIN_ROLES_NEW,
  rolesAssign: ROUTES.ADMIN_ROLES_ASSIGN,
  settings: ROUTES.ADMIN_SETTINGS,
  settingsOpd: ROUTES.ADMIN_SETTINGS_OPD,
  settingsDoctor: ROUTES.ADMIN_SETTINGS_DOCTOR,
  settingsReceptionist: ROUTES.ADMIN_SETTINGS_RECEPTIONIST,
  settingsLab: ROUTES.ADMIN_SETTINGS_LAB,
  settingsNurse: ROUTES.ADMIN_SETTINGS_NURSE,
  settingsPharmacy: ROUTES.ADMIN_SETTINGS_PHARMACY,
  reports: ROUTES.ADMIN_REPORTS,
  audit: ROUTES.ADMIN_AUDIT,
  profile: ROUTES.ADMIN_PROFILE,
};

function screen(page) {
  return (
    <LazyRoute>
      {page}
    </LazyRoute>
  );
}

/** Hospital registration returns super_admin. Role admin remains an owner too. */
const OWNER_PANEL_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

function ownerPanelRoutes(allowedRoles, paths, unmatchedPath) {
  return {
    element: (
      <ProtectedRoute
        allowedRoles={allowedRoles}
        loginPath={ROUTES.LOGIN}
      />
    ),
    children: [
      {
        element: <SuperAdminAppShell />,
        children: [
          { path: paths.dashboard, element: screen(<SuperAdminDashboardPage />) },
          { path: paths.staff, element: screen(<SuperAdminStaffListPage />) },
          { path: paths.staffNew, element: screen(<SuperAdminStaffRegisterPage />) },
          { path: paths.staffDetail, element: screen(<SuperAdminStaffDetailPage />) },
          { path: paths.departments, element: screen(<SuperAdminDepartmentsListPage />) },
          { path: paths.departmentsNew, element: screen(<SuperAdminDepartmentCreatePage />) },
          { path: paths.departmentDetail, element: screen(<SuperAdminDepartmentDetailPage />) },
          { path: paths.roles, element: screen(<SuperAdminRolesListPage />) },
          { path: paths.rolesNew, element: screen(<SuperAdminRoleCreatePage />) },
          { path: paths.rolesAssign, element: screen(<SuperAdminAssignPermissionsPage />) },
          { path: paths.settings, element: <Navigate to={paths.settingsOpd} replace /> },
          { path: paths.settingsOpd, element: screen(<SuperAdminModuleSettingsPage />) },
          { path: paths.settingsDoctor, element: screen(<SuperAdminModuleSettingsPage />) },
          { path: paths.settingsReceptionist, element: screen(<SuperAdminModuleSettingsPage />) },
          { path: paths.settingsLab, element: screen(<SuperAdminModuleSettingsPage />) },
          { path: paths.settingsNurse, element: screen(<SuperAdminModuleSettingsPage />) },
          { path: paths.settingsPharmacy, element: screen(<SuperAdminModuleSettingsPage />) },
          { path: paths.reports, element: screen(<SuperAdminReportsPage />) },
          { path: paths.audit, element: screen(<SuperAdminAuditLogPage />) },
          { path: paths.profile, element: screen(<SuperAdminProfilePage />) },
          { path: paths.root, element: <Navigate to={paths.dashboard} replace /> },
          { path: unmatchedPath, element: screen(<NotFoundPage />) },
        ],
      },
    ],
  };
}

/** Old hospital owner URLs now live under /admin. */
function LegacyOwnerRedirect() {
  const { pathname, search, hash } = useLocation();
  const rest = pathname.replace(/^\/super-admin(?=\/|$)/, '') || '/dashboard';
  return <Navigate to={`/admin${rest}${search}${hash}`} replace />;
}

export const adminRoutes = [
  { path: '/super-admin', element: <Navigate to={ROUTES.ADMIN_DASHBOARD} replace /> },
  { path: '/super-admin/*', element: <LegacyOwnerRedirect /> },
  ownerPanelRoutes(OWNER_PANEL_ROLES, HOSPITAL_ADMIN_PATHS, '/admin/*'),
];
