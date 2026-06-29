import { lazy } from 'react';
import ProtectedRoute from '@/components/security/ProtectedRoute';
import DoctorAppShell from '@/features/doctor/components/DoctorAppShell';
import { ROUTES, ROLES } from '@/shared/constants';
import LazyRoute from '@/routes/LazyRoute';

const DoctorDashboardPage = lazy(() => import('@/features/doctor/pages/DoctorDashboardPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export const doctorRoutes = [
  {
    element: <ProtectedRoute allowedRoles={[ROLES.DOCTOR]} />,
    children: [
      {
        element: <DoctorAppShell />,
        children: [
          {
            path: ROUTES.DOCTOR_DASHBOARD,
            element: (
              <LazyRoute>
                <DoctorDashboardPage />
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
