import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/security/ProtectedRoute';
import PharmacyAppShell from '@/features/pharmacy/components/PharmacyAppShell';
import { ROUTES, ROLES } from '@/shared/constants';
import LazyRoute from '@/routes/LazyRoute';

const PrescriptionListPage = lazy(() => import('@/features/pharmacy/pages/PrescriptionListPage'));
const PrescriptionDetailPage = lazy(() => import('@/features/pharmacy/pages/PrescriptionDetailPage'));
const DispensePage = lazy(() => import('@/features/pharmacy/pages/DispensePage'));
const DispenseHistoryPage = lazy(() => import('@/features/pharmacy/pages/DispenseHistoryPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export const pharmacyRoutes = [
  {
    element: <ProtectedRoute allowedRoles={[ROLES.PHARMACIST]} />,
    children: [
      {
        element: <PharmacyAppShell />,
        children: [
          {
            path: ROUTES.PHARMACY_DASHBOARD,
            element: <Navigate to={ROUTES.PHARMACY_PRESCRIPTIONS} replace />,
          },
          {
            path: ROUTES.PHARMACY_PRESCRIPTIONS,
            element: (
              <LazyRoute>
                <PrescriptionListPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.PHARMACY_PRESCRIPTION_DETAIL,
            element: (
              <LazyRoute>
                <PrescriptionDetailPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.PHARMACY_DISPENSE,
            element: (
              <LazyRoute>
                <DispensePage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.PHARMACY_HISTORY,
            element: (
              <LazyRoute>
                <DispenseHistoryPage />
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
