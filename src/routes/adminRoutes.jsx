import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/security/ProtectedRoute';
import AdminAppShell from '@/features/admin/components/AdminAppShell';
import { ROUTES, ROLES } from '@/shared/constants';
import LazyRoute from '@/routes/LazyRoute';

const AdminDashboardPage = lazy(() => import('@/features/admin/pages/AdminDashboardPage'));
const StaffListPage = lazy(() => import('@/features/admin/pages/StaffListPage'));
const StaffDetailPage = lazy(() => import('@/features/admin/pages/StaffDetailPage'));
const StaffRegisterPage = lazy(() => import('@/features/admin/pages/StaffRegisterPage'));
const RolesListPage = lazy(() => import('@/features/admin/pages/RolesListPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export const adminRoutes = [
  {
    element: <ProtectedRoute allowedRoles={[ROLES.ADMIN]} />,
    children: [
      {
        element: <AdminAppShell />,
        children: [
          {
            path: ROUTES.ADMIN_DASHBOARD,
            element: (
              <LazyRoute>
                <AdminDashboardPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_STAFF,
            element: (
              <LazyRoute>
                <StaffListPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_STAFF_NEW,
            element: (
              <LazyRoute>
                <StaffRegisterPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_STAFF_DETAIL,
            element: (
              <LazyRoute>
                <StaffDetailPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_ROLES,
            element: (
              <LazyRoute>
                <RolesListPage />
              </LazyRoute>
            ),
          },
          {
            path: '/admin',
            element: <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />,
          },
          {
            path: '/admin/*',
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
