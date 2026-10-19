import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
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

export const adminRoutes = [
  {
    element: (
      <ProtectedRoute
        allowedRoles={[ROLES.SUPER_ADMIN]}
        loginPath={ROUTES.LOGIN}
      />
    ),
    children: [
      {
        element: <SuperAdminAppShell />,
        children: [
          {
            path: ROUTES.SUPER_ADMIN_DASHBOARD,
            element: (
              <LazyRoute>
                <SuperAdminDashboardPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.SUPER_ADMIN_STAFF,
            element: (
              <LazyRoute>
                <SuperAdminStaffListPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.SUPER_ADMIN_STAFF_NEW,
            element: (
              <LazyRoute>
                <SuperAdminStaffRegisterPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.SUPER_ADMIN_STAFF_DETAIL,
            element: (
              <LazyRoute>
                <SuperAdminStaffDetailPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.SUPER_ADMIN_DEPARTMENTS,
            element: (
              <LazyRoute>
                <SuperAdminDepartmentsListPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.SUPER_ADMIN_DEPARTMENTS_NEW,
            element: (
              <LazyRoute>
                <SuperAdminDepartmentCreatePage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.SUPER_ADMIN_DEPARTMENT_DETAIL,
            element: (
              <LazyRoute>
                <SuperAdminDepartmentDetailPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.SUPER_ADMIN_ROLES,
            element: (
              <LazyRoute>
                <SuperAdminRolesListPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.SUPER_ADMIN_ROLES_NEW,
            element: (
              <LazyRoute>
                <SuperAdminRoleCreatePage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.SUPER_ADMIN_ROLES_ASSIGN,
            element: (
              <LazyRoute>
                <SuperAdminAssignPermissionsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.SUPER_ADMIN_SETTINGS,
            element: <Navigate to={ROUTES.SUPER_ADMIN_SETTINGS_OPD} replace />,
          },
          {
            path: ROUTES.SUPER_ADMIN_SETTINGS_OPD,
            element: (
              <LazyRoute>
                <SuperAdminModuleSettingsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.SUPER_ADMIN_SETTINGS_DOCTOR,
            element: (
              <LazyRoute>
                <SuperAdminModuleSettingsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.SUPER_ADMIN_SETTINGS_RECEPTIONIST,
            element: (
              <LazyRoute>
                <SuperAdminModuleSettingsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.SUPER_ADMIN_SETTINGS_LAB,
            element: (
              <LazyRoute>
                <SuperAdminModuleSettingsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.SUPER_ADMIN_SETTINGS_NURSE,
            element: (
              <LazyRoute>
                <SuperAdminModuleSettingsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.SUPER_ADMIN_SETTINGS_PHARMACY,
            element: (
              <LazyRoute>
                <SuperAdminModuleSettingsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.SUPER_ADMIN_REPORTS,
            element: (
              <LazyRoute>
                <SuperAdminReportsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.SUPER_ADMIN_AUDIT,
            element: (
              <LazyRoute>
                <SuperAdminAuditLogPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.SUPER_ADMIN_PROFILE,
            element: (
              <LazyRoute>
                <SuperAdminProfilePage />
              </LazyRoute>
            ),
          },
          {
            path: '/super-admin',
            element: <Navigate to={ROUTES.SUPER_ADMIN_DASHBOARD} replace />,
          },
          {
            path: '*',
            element: (
              <LazyRoute>
                <NotFoundPage />
              </LazyRoute>
            ),
          },
        ],
      },
    ],
  },
];
