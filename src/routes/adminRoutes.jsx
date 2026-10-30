import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/security/ProtectedRoute';
import AdminAppShell from '@/features/admin/components/AdminAppShell';
import { ROUTES, ROLES } from '@/shared/constants';
import LazyRoute from '@/routes/LazyRoute';
import LegacyOwnerRedirect from '@/routes/LegacyOwnerRedirect';

const AdminDashboardPage = lazy(() => import('@/features/admin/pages/AdminDashboardPage'));
const AdminStaffListPage = lazy(() => import('@/features/admin/pages/AdminStaffListPage'));
const AdminStaffRegisterPage = lazy(() => import('@/features/admin/pages/AdminStaffRegisterPage'));
const AdminStaffDetailPage = lazy(() => import('@/features/admin/pages/AdminStaffDetailPage'));
const AdminDepartmentCreatePage = lazy(() => import('@/features/admin/pages/AdminDepartmentCreatePage'));
const AdminDepartmentDetailPage = lazy(() => import('@/features/admin/pages/AdminDepartmentDetailPage'));
const AdminDepartmentsListPage = lazy(() => import('@/features/admin/pages/AdminDepartmentsListPage'));
const AdminRolesListPage = lazy(() => import('@/features/admin/pages/AdminRolesListPage'));
const AdminRoleCreatePage = lazy(() => import('@/features/admin/pages/AdminRoleCreatePage'));
const AdminAssignPermissionsPage = lazy(() => import('@/features/admin/pages/AdminAssignPermissionsPage'));
const AdminModuleSettingsPage = lazy(() => import('@/features/admin/pages/AdminModuleSettingsPage'));
const AdminReportsPage = lazy(() => import('@/features/admin/pages/AdminReportsPage'));
const AdminAuditLogPage = lazy(() => import('@/features/admin/pages/AdminAuditLogPage'));
const AdminProfilePage = lazy(() => import('@/features/admin/pages/AdminProfilePage'));
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
        element: <AdminAppShell />,
        children: [
          { path: paths.dashboard, element: screen(<AdminDashboardPage />) },
          { path: paths.staff, element: screen(<AdminStaffListPage />) },
          { path: paths.staffNew, element: screen(<AdminStaffRegisterPage />) },
          { path: paths.staffDetail, element: screen(<AdminStaffDetailPage />) },
          { path: paths.departments, element: screen(<AdminDepartmentsListPage />) },
          { path: paths.departmentsNew, element: screen(<AdminDepartmentCreatePage />) },
          { path: paths.departmentDetail, element: screen(<AdminDepartmentDetailPage />) },
          { path: paths.roles, element: screen(<AdminRolesListPage />) },
          { path: paths.rolesNew, element: screen(<AdminRoleCreatePage />) },
          { path: paths.rolesAssign, element: screen(<AdminAssignPermissionsPage />) },
          { path: paths.settings, element: <Navigate to={paths.settingsOpd} replace /> },
          { path: paths.settingsOpd, element: screen(<AdminModuleSettingsPage />) },
          { path: paths.settingsDoctor, element: screen(<AdminModuleSettingsPage />) },
          { path: paths.settingsReceptionist, element: screen(<AdminModuleSettingsPage />) },
          { path: paths.settingsLab, element: screen(<AdminModuleSettingsPage />) },
          { path: paths.settingsNurse, element: screen(<AdminModuleSettingsPage />) },
          { path: paths.settingsPharmacy, element: screen(<AdminModuleSettingsPage />) },
          { path: paths.reports, element: screen(<AdminReportsPage />) },
          { path: paths.audit, element: screen(<AdminAuditLogPage />) },
          { path: paths.profile, element: screen(<AdminProfilePage />) },
          { path: paths.root, element: <Navigate to={paths.dashboard} replace /> },
          { path: unmatchedPath, element: screen(<NotFoundPage />) },
        ],
      },
    ],
  };
}

export const adminRoutes = [
  { path: '/super-admin', element: <Navigate to={ROUTES.ADMIN_DASHBOARD} replace /> },
  { path: '/super-admin/*', element: <LegacyOwnerRedirect /> },
  ownerPanelRoutes(OWNER_PANEL_ROLES, HOSPITAL_ADMIN_PATHS, '/admin/*'),
];
