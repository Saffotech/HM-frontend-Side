import { lazy } from 'react';
import ProtectedRoute from '@/components/security/ProtectedRoute';
import DoctorAppShell from '@/features/doctor/components/DoctorAppShell';
import { ROUTES, ROLES } from '@/shared/constants';
import LazyRoute from '@/routes/LazyRoute';

const DoctorDashboardPage = lazy(() => import('@/features/doctor/pages/DoctorDashboardPage'));
// Doctor Phase 2 by Atharva — register self-service profile page
const DoctorProfilePage = lazy(() => import('@/features/doctor/pages/DoctorProfilePage'));
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
            // Doctor Phase 2 by Atharva — /doctor/profile
            path: ROUTES.DOCTOR_PROFILE,
            element: (
              <LazyRoute>
                <DoctorProfilePage />
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
