import { lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
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
import { ipdRoutes } from '@/routes/ipdRoutes';
import { managerRoutes } from '@/routes/managerRoutes';
import { adminRoutes } from '@/routes/adminRoutes';

const LandingPage = lazy(() => import('@/pages/landing/LandingPage'));
const AboutPage = lazy(() => import('@/pages/landing/AboutPage'));
const LoginPage = lazy(() => import('@/pages/landing/LoginPage'));
const PatientLoginPage = lazy(() => import('@/pages/landing/PatientLoginPage'));
const ReceptionistRegisterPage = lazy(
  () => import('@/features/receptionist/pages/ReceptionistRegisterPage')
);
const UnauthorizedPage = lazy(() => import('@/pages/UnauthorizedPage'));
// Platform Admin: separate SaaS-owner app (super admin / CRM / accounts), lazy-loaded under /platform/*
const PlatformApp = lazy(() => import('@/features/Platform Admin/PlatformApp'));

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
          path={ROUTES.ABOUT}
          element={
            <LazyRoute>
              <GuestRoute>
                <AboutPage />
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

        <Route path={ROUTES.PHARMACY_LOGIN} element={<Navigate to={ROUTES.LOGIN} replace />} />

        <Route path={ROUTES.RECEPTIONIST_LOGIN} element={<Navigate to={ROUTES.LOGIN} replace />} />

        <Route
          path={ROUTES.RECEPTIONIST_REGISTER}
          element={
            <LazyRoute>
              <ReceptionistRegisterPage />
            </LazyRoute>
          }
        />

        <Route path={ROUTES.ADMIN_LOGIN} element={<Navigate to={ROUTES.LOGIN} replace />} />

        <Route path={ROUTES.SUPER_ADMIN_LOGIN} element={<Navigate to={ROUTES.LOGIN} replace />} />

        {/* Platform Admin: kept outside ProtectedRoute so hospital auth never applies to it */}
        <Route
          path={`${ROUTES.PLATFORM}/*`}
          element={
            <LazyRoute>
              <PlatformApp />
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
          {renderRoutes(ipdRoutes)}
          {renderRoutes(opdRoutes)}
          {renderRoutes(managerRoutes)}
          {renderRoutes(adminRoutes)}
        </Route>
      </Routes>

      <ToastContainer />
    </BrowserRouter>
  );
}
