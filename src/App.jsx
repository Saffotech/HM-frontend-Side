import { lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ToastContainer } from '@/shared/components/common';
import ProtectedRoute from '@/components/security/ProtectedRoute';
import GuestRoute from '@/components/security/GuestRoute';
import SessionTimeout from '@/components/security/SessionTimeout';
import { ROUTES } from '@/shared/constants';
import { ROUTER_FUTURE_FLAGS } from '@/shared/constants/routerFuture';
import LazyRoute from '@/routes/LazyRoute';
import { renderRoutes } from '@/routes/renderRoutes';
import { doctorRoutes } from '@/routes/doctorRoutes';
import { labRoutes } from '@/routes/labRoutes';
import { pharmacyRoutes } from '@/routes/pharmacyRoutes';
import { nurseRoutes } from '@/routes/nurseRoutes';
import { opdRoutes } from '@/routes/opdRoutes';
import { receptionistRoutes } from '@/routes/receptionistRoutes';
import { adminRoutes } from '@/routes/adminRoutes';
import { superAdminRoutes } from '@/routes/superAdminRoutes';

const LandingPage = lazy(() => import('@/pages/landing/LandingPage'));
const LoginPage = lazy(() => import('@/pages/landing/LoginPage'));
const PatientLoginPage = lazy(() => import('@/pages/landing/PatientLoginPage'));
const PharmacyLoginPage = lazy(() => import('@/features/pharmacy/pages/PharmacyLoginPage'));
const ReceptionistLoginPage = lazy(
  () => import('@/features/receptionist/pages/ReceptionistLoginPage')
);
const ReceptionistRegisterPage = lazy(
  () => import('@/features/receptionist/pages/ReceptionistRegisterPage')
);
const AdminLoginPage = lazy(() => import('@/features/admin/pages/AdminLoginPage'));
const SuperAdminLoginPage = lazy(() => import('@/features/super-admin/pages/SuperAdminLoginPage'));
const UnauthorizedPage = lazy(() => import('@/pages/UnauthorizedPage'));

export default function App() {
  return (
    <BrowserRouter future={ROUTER_FUTURE_FLAGS}>
      <SessionTimeout />
      <Routes>
        <Route
          path={ROUTES.HOME}
          element={
            <LazyRoute>
              <GuestRoute>
                <LandingPage />
              </GuestRoute>
            </LazyRoute>
          }
        />

        <Route
          path={ROUTES.LOGIN}
          element={
            <LazyRoute>
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            </LazyRoute>
          }
        />

        <Route
          path={ROUTES.PATIENT_LOGIN}
          element={
            <LazyRoute>
              <PatientLoginPage />
            </LazyRoute>
          }
        />

        <Route
          path={ROUTES.PHARMACY_LOGIN}
          element={
            <LazyRoute>
              <GuestRoute>
                <PharmacyLoginPage />
              </GuestRoute>
            </LazyRoute>
          }
        />

        <Route
          path={ROUTES.RECEPTIONIST_LOGIN}
          element={
            <LazyRoute>
              <GuestRoute>
                <ReceptionistLoginPage />
              </GuestRoute>
            </LazyRoute>
          }
        />

        <Route
          path={ROUTES.RECEPTIONIST_REGISTER}
          element={
            <LazyRoute>
              <ReceptionistRegisterPage />
            </LazyRoute>
          }
        />

        <Route
          path={ROUTES.ADMIN_LOGIN}
          element={
            <LazyRoute>
              <GuestRoute>
                <AdminLoginPage />
              </GuestRoute>
            </LazyRoute>
          }
        />

        <Route
          path={ROUTES.SUPER_ADMIN_LOGIN}
          element={
            <LazyRoute>
              <GuestRoute>
                <SuperAdminLoginPage />
              </GuestRoute>
            </LazyRoute>
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route
            path={ROUTES.UNAUTHORIZED}
            element={
              <LazyRoute>
                <UnauthorizedPage />
              </LazyRoute>
            }
          />

          {renderRoutes(doctorRoutes)}
          {renderRoutes(labRoutes)}
          {renderRoutes(pharmacyRoutes)}
          {renderRoutes(nurseRoutes)}
          {renderRoutes(receptionistRoutes)}
          {renderRoutes(opdRoutes)}
          {renderRoutes(adminRoutes)}
          {renderRoutes(superAdminRoutes)}
        </Route>
      </Routes>

      <ToastContainer />
    </BrowserRouter>
  );
}
