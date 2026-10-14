import { lazy } from 'react';
import ProtectedRoute from '@/components/security/ProtectedRoute';
import IpdAppShell from '@/features/ipd/components/IpdAppShell';
import { ROUTES, ROLES } from '@/shared/constants';
import LazyRoute from '@/routes/LazyRoute';

const IpdDashboardPage = lazy(() => import('@/features/ipd/pages/IpdDashboardPage'));
const IpdAdmitPatientPage = lazy(() => import('@/features/ipd/pages/IpdAdmitPatientPage'));
const IpdPatientListPage = lazy(() => import('@/features/ipd/pages/IpdPatientListPage'));
const IpdPatientDetailPage = lazy(() => import('@/features/ipd/pages/IpdPatientDetailPage'));
const IpdBedsPage = lazy(() => import('@/features/ipd/pages/IpdBedsPage'));
const IpdBedTransferPage = lazy(() => import('@/features/ipd/pages/IpdBedTransferPage'));
const IpdBillingPage = lazy(() => import('@/features/ipd/pages/IpdBillingPage'));
const IpdBillPreviewPage = lazy(() => import('@/features/ipd/pages/IpdBillPreviewPage'));
const IpdViewBillPage = lazy(() => import('@/features/ipd/pages/IpdViewBillPage'));
const IpdPaymentHistoryPage = lazy(() => import('@/features/ipd/pages/IpdPaymentHistoryPage'));
const IpdDischargePage = lazy(() => import('@/features/ipd/pages/IpdDischargePage'));
const IpdInsurancePatientPage = lazy(() => import('@/features/ipd/pages/IpdInsurancePatientPage'));
const IpdInsuranceBillingPage = lazy(() => import('@/features/ipd/pages/IpdInsuranceBillingPage'));
const IpdPricingPage = lazy(() => import('@/features/ipd/pages/IpdPricingPage'));
const IpdProfilePage = lazy(() => import('@/features/ipd/pages/IpdProfilePage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export const ipdRoutes = [
  {
    element: (
      <ProtectedRoute
        allowedRoles={[ROLES.IPD]}
        loginPath={ROUTES.LOGIN}
      />
    ),
    children: [
      {
        element: <IpdAppShell />,
        children: [
          {
            path: ROUTES.IPD_DASHBOARD,
            element: (
              <LazyRoute>
                <IpdDashboardPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.IPD_ADMIT,
            element: (
              <LazyRoute>
                <IpdAdmitPatientPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.IPD_INSURANCE_PATIENT,
            element: (
              <LazyRoute>
                <IpdInsurancePatientPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.IPD_PATIENT_DETAIL,
            element: (
              <LazyRoute>
                <IpdPatientDetailPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.IPD_PATIENTS,
            element: (
              <LazyRoute>
                <IpdPatientListPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.IPD_BED_TRANSFER,
            element: (
              <LazyRoute>
                <IpdBedTransferPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.IPD_BEDS,
            element: (
              <LazyRoute>
                <IpdBedsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.IPD_INSURANCE_BILLING,
            element: (
              <LazyRoute>
                <IpdInsuranceBillingPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.IPD_BILL_PREVIEW,
            element: (
              <LazyRoute>
                <IpdBillPreviewPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.IPD_BILL_VIEW,
            element: (
              <LazyRoute>
                <IpdViewBillPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.IPD_BILLING,
            element: (
              <LazyRoute>
                <IpdBillingPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.IPD_PAYMENT_HISTORY,
            element: (
              <LazyRoute>
                <IpdPaymentHistoryPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.IPD_DISCHARGE_ADMISSION,
            element: (
              <LazyRoute>
                <IpdDischargePage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.IPD_DISCHARGE,
            element: (
              <LazyRoute>
                <IpdDischargePage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.IPD_PRICING,
            element: (
              <LazyRoute>
                <IpdPricingPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.IPD_PROFILE,
            element: (
              <LazyRoute>
                <IpdProfilePage />
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
