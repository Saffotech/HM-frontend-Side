import { lazy } from 'react';
import ProtectedRoute from '@/components/security/ProtectedRoute';
import LabAppShell from '@/features/lab/components/LabAppShell';
import { ROUTES, ROLES } from '@/shared/constants';
import LazyRoute from '@/routes/LazyRoute';

const LabDashboardPage = lazy(() => import('@/features/lab/pages/LabDashboardPage'));
const LabOrderListPage = lazy(() => import('@/features/lab/pages/LabOrderListPage'));
const LabUploadReportPage = lazy(() => import('@/features/lab/pages/LabUploadReportPage'));
const LabCompletedReportsPage = lazy(() => import('@/features/lab/pages/LabCompletedReportsPage'));
const LabProfilePage = lazy(() => import('@/features/lab/pages/LabProfilePage'));
const LabNotificationsPage = lazy(() => import('@/features/lab/pages/LabNotificationsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export const labRoutes = [
  {
    element: <ProtectedRoute allowedRoles={[ROLES.LAB_TECHNICIAN]} />,
    children: [
      {
        element: <LabAppShell />,
        children: [
          {
            path: ROUTES.LAB_DASHBOARD,
            element: (
              <LazyRoute>
                <LabDashboardPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.LAB_ORDERS,
            element: (
              <LazyRoute>
                <LabOrderListPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.LAB_ORDER_UPLOAD,
            element: (
              <LazyRoute>
                <LabUploadReportPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.LAB_REPORTS,
            element: (
              <LazyRoute>
                <LabCompletedReportsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.LAB_PROFILE,
            element: (
              <LazyRoute>
                <LabProfilePage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.LAB_NOTIFICATIONS,
            element: (
              <LazyRoute>
                <LabNotificationsPage />
              </LazyRoute>
            ),
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
