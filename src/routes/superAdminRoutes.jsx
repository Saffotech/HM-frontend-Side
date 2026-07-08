import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/security/ProtectedRoute';
import SuperAdminAppShell from '@/features/super-admin/components/SuperAdminAppShell';
import { ROUTES, ROLES } from '@/shared/constants';
import LazyRoute from '@/routes/LazyRoute';

const SuperAdminDashboardPage = lazy(() => import('@/features/super-admin/pages/SuperAdminDashboardPage'));
const SuperAdminStaffListPage = lazy(() => import('@/features/super-admin/pages/SuperAdminStaffListPage'));
const SuperAdminStaffRegisterPage = lazy(() => import('@/features/super-admin/pages/SuperAdminStaffRegisterPage'));
const SuperAdminStaffDetailPage = lazy(() => import('@/features/super-admin/pages/SuperAdminStaffDetailPage'));
const SuperAdminRolesListPage = lazy(() => import('@/features/super-admin/pages/SuperAdminRolesListPage'));
const SuperAdminRoleCreatePage = lazy(() => import('@/features/super-admin/pages/SuperAdminRoleCreatePage'));
const SuperAdminAssignPermissionsPage = lazy(() => import('@/features/super-admin/pages/SuperAdminAssignPermissionsPage'));
const SuperAdminSettingsPage = lazy(() => import('@/features/super-admin/pages/SuperAdminSettingsPage'));
const SuperAdminReportsPage = lazy(() => import('@/features/super-admin/pages/SuperAdminReportsPage'));
const SuperAdminAuditLogPage = lazy(() => import('@/features/super-admin/pages/SuperAdminAuditLogPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export const superAdminRoutes = [
  {
    element: (
      <ProtectedRoute
        allowedRoles={[ROLES.SUPER_ADMIN]}
        loginPath={ROUTES.SUPER_ADMIN_LOGIN}
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
            element: (
              <LazyRoute>
                <SuperAdminSettingsPage />
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
