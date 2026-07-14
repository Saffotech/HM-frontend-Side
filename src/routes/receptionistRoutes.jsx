import { lazy } from 'react';
import ProtectedRoute from '@/components/security/ProtectedRoute';
import ReceptionistAppShell from '@/features/receptionist/components/ReceptionistAppShell';
import { ROUTES, ROLES } from '@/shared/constants';
import LazyRoute from '@/routes/LazyRoute';

const ReceptionistDashboardPage = lazy(
  () => import('@/features/receptionist/pages/ReceptionistDashboardPage'),
);
const TodayQueuePage = lazy(
  () => import('@/features/receptionist/pages/TodayQueuePage'),
);
const DoctorQueuesPage = lazy(
  () => import('@/features/receptionist/pages/DoctorQueuesPage'),
);
const QueueHistoryPage = lazy(
  () => import('@/features/receptionist/pages/QueueHistoryPage'),
);
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export const receptionistRoutes = [
  {
    element: (
      <ProtectedRoute
        allowedRoles={[ROLES.RECEPTIONIST]}
        loginPath={ROUTES.RECEPTIONIST_LOGIN}
      />
    ),
    children: [
      {
        element: <ReceptionistAppShell />,
        children: [
          {
            path: ROUTES.RECEPTIONIST_DASHBOARD,
            element: (
              <LazyRoute>
                <ReceptionistDashboardPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.RECEPTIONIST_TODAY_QUEUE,
            element: (
              <LazyRoute>
                <TodayQueuePage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.RECEPTIONIST_DOCTOR_QUEUES,
            element: (
              <LazyRoute>
                <DoctorQueuesPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.RECEPTIONIST_QUEUE_HISTORY,
            element: (
              <LazyRoute>
                <QueueHistoryPage />
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
