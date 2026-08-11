import { lazy } from 'react';
import { Outlet } from 'react-router-dom';
import { Layout } from '@/shared/components/common';
import ProtectedRoute from '@/components/security/ProtectedRoute';
import { ROUTES } from '@/shared/constants';
import { OPD_SHELL_ROLES } from '@/shared/utils/authRedirect';
import LazyRoute from '@/routes/LazyRoute';

const DashboardPage = lazy(() => import('@/features/opd/pages/DashboardPage'));
const PatientListPage = lazy(() => import('@/features/opd/pages/PatientListPage'));
const RegisterPatientPage = lazy(() => import('@/features/opd/pages/RegisterPatientPage'));
const UpdatePatientPage = lazy(() => import('@/features/opd/pages/UpdatePatientPage'));
const PatientProfilePage = lazy(() => import('@/features/opd/pages/PatientProfilePage'));
const AppointmentListPage = lazy(() => import('@/features/opd/pages/AppointmentListPage'));
const BookAppointmentPage = lazy(() => import('@/features/opd/pages/BookAppointmentPage'));
const DoctorAvailabilityPage = lazy(() => import('@/features/opd/pages/DoctorAvailabilityPage'));
const BillingListPage = lazy(() => import('@/features/opd/billing/pages/BillingListPage'));
const OpdBillPage = lazy(() => import('@/features/opd/billing/pages/OpdBillPage'));
const ViewBillPage = lazy(() => import('@/features/opd/billing/pages/ViewBillPage'));
const PaymentHistoryPage = lazy(() => import('@/features/opd/billing/pages/PaymentHistoryPage'));
const OpdBillingProfilePage = lazy(() => import('@/features/opd/pages/OpdBillingProfilePage'));
const OpdBillingNotificationsPage = lazy(() => import('@/features/opd/pages/OpdBillingNotificationsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function LayoutShell() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export const opdRoutes = [
  {
    element: <ProtectedRoute allowedRoles={OPD_SHELL_ROLES} />,
    children: [
      {
        element: <LayoutShell />,
        children: [
          {
            path: ROUTES.DASHBOARD,
            element: (
              <LazyRoute>
                <DashboardPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.PATIENTS_REGISTER,
            element: (
              <LazyRoute>
                <RegisterPatientPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.PATIENT_PROFILE,
            element: (
              <LazyRoute>
                <PatientProfilePage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.PATIENT_UPDATE,
            element: (
              <LazyRoute>
                <UpdatePatientPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.PATIENTS,
            element: (
              <LazyRoute>
                <PatientListPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.APPOINTMENTS_BOOK,
            element: (
              <LazyRoute>
                <BookAppointmentPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.APPOINTMENTS_AVAILABILITY,
            element: (
              <LazyRoute>
                <DoctorAvailabilityPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.APPOINTMENTS,
            element: (
              <LazyRoute>
                <AppointmentListPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.BILLING_OPD_NEW,
            element: (
              <LazyRoute>
                <OpdBillPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.BILLING_VIEW,
            element: (
              <LazyRoute>
                <ViewBillPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.BILLING,
            element: (
              <LazyRoute>
                <BillingListPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.PAYMENT_HISTORY,
            element: (
              <LazyRoute>
                <PaymentHistoryPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.OPD_PROFILE,
            element: (
              <LazyRoute>
                <OpdBillingProfilePage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.OPD_NOTIFICATIONS,
            element: (
              <LazyRoute>
                <OpdBillingNotificationsPage />
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
