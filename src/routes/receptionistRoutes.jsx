import { lazy } from 'react';
import ProtectedRoute from '@/components/security/ProtectedRoute';
import ReceptionistAppShell from '@/features/receptionist/components/ReceptionistAppShell';
import { ROUTES, ROLES } from '@/shared/constants';
import LazyRoute from '@/routes/LazyRoute';

const ReceptionistDashboardPage = lazy(
  () => import('@/features/receptionist/pages/ReceptionistDashboardPage')
);
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export const receptionistRoutes = [
  {
    element: <ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]} loginPath={ROUTES.RECEPTIONIST_LOGIN} />,
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
