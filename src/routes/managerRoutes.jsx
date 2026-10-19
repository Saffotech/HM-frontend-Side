import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/security/ProtectedRoute';
import AdminAppShell from '@/features/manager/components/ManagerAppShell';
import { ROUTES, ROLES } from '@/shared/constants';
import LazyRoute from '@/routes/LazyRoute';

const AdminDashboardPage = lazy(() => import('@/features/manager/pages/ManagerDashboardPage'));
const StaffListPage = lazy(() => import('@/features/manager/pages/StaffListPage'));
const StaffDetailPage = lazy(() => import('@/features/manager/pages/StaffDetailPage'));
const StaffRegisterPage = lazy(() => import('@/features/manager/pages/StaffRegisterPage'));
const RolesListPage = lazy(() => import('@/features/manager/pages/RolesListPage'));
const DepartmentListPage = lazy(() => import('@/features/manager/pages/DepartmentListPage'));
const DepartmentCreatePage = lazy(() => import('@/features/manager/pages/DepartmentCreatePage'));
const DepartmentDetailPage = lazy(() => import('@/features/manager/pages/DepartmentDetailPage'));
const ReportsOverviewPage = lazy(() => import('@/features/manager/pages/ReportsOverviewPage'));
const VisitsReportPage = lazy(() => import('@/features/manager/pages/VisitsReportPage'));
const NurseBedAllocationListPage = lazy(() => import('@/features/manager/pages/NurseBedAllocationListPage'));
const NurseBedAllocationCreatePage = lazy(() => import('@/features/manager/pages/NurseBedAllocationCreatePage'));
const NurseBedAllocationDetailPage = lazy(() => import('@/features/manager/pages/NurseBedAllocationDetailPage'));
const NurseBedAllocationEditPage = lazy(() => import('@/features/manager/pages/NurseBedAllocationEditPage'));
const NurseWorkforceDashboardPage = lazy(() => import('@/features/manager/pages/NurseWorkforceDashboardPage'));
const NurseWorkforceShiftsPage = lazy(() => import('@/features/manager/pages/NurseWorkforceShiftsPage'));
const NurseWorkforceRosterPage = lazy(() => import('@/features/manager/pages/NurseWorkforceRosterPage'));
const AdminSettingsPage = lazy(() => import('@/features/manager/pages/ManagerSettingsPage'));
const AdminProfilePage = lazy(() => import('@/features/manager/pages/ManagerProfilePage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export const managerRoutes = [
  {
    element: <ProtectedRoute allowedRoles={[ROLES.ADMIN]} />,
    children: [
      {
        element: <AdminAppShell />,
        children: [
          {
            path: ROUTES.ADMIN_DASHBOARD,
            element: (
              <LazyRoute>
                <AdminDashboardPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_STAFF,
            element: (
              <LazyRoute>
                <StaffListPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_STAFF_NEW,
            element: (
              <LazyRoute>
                <StaffRegisterPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_STAFF_DETAIL,
            element: (
              <LazyRoute>
                <StaffDetailPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_BED_ALLOCATION,
            element: (
              <LazyRoute>
                <NurseBedAllocationListPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_BED_ALLOCATION_NEW,
            element: (
              <LazyRoute>
                <NurseBedAllocationCreatePage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_BED_ALLOCATION_EDIT,
            element: (
              <LazyRoute>
                <NurseBedAllocationEditPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_BED_ALLOCATION_DETAIL,
            element: (
              <LazyRoute>
                <NurseBedAllocationDetailPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_NURSE_WORKFORCE,
            element: (
              <LazyRoute>
                <NurseWorkforceDashboardPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_NURSE_WORKFORCE_SHIFTS,
            element: (
              <LazyRoute>
                <NurseWorkforceShiftsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_NURSE_WORKFORCE_ROSTER,
            element: (
              <LazyRoute>
                <NurseWorkforceRosterPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_ROLES,
            element: (
              <LazyRoute>
                <RolesListPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_DEPARTMENTS,
            element: (
              <LazyRoute>
                <DepartmentListPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_DEPARTMENTS_NEW,
            element: (
              <LazyRoute>
                <DepartmentCreatePage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_DEPARTMENT_DETAIL,
            element: (
              <LazyRoute>
                <DepartmentDetailPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_REPORTS,
            element: (
              <LazyRoute>
                <ReportsOverviewPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_REPORTS_VISITS,
            element: (
              <LazyRoute>
                <VisitsReportPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_SETTINGS,
            element: <Navigate to={ROUTES.ADMIN_SETTINGS_OPD} replace />,
          },
          {
            path: ROUTES.ADMIN_SETTINGS_OPD,
            element: (
              <LazyRoute>
                <AdminSettingsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_SETTINGS_DOCTOR,
            element: (
              <LazyRoute>
                <AdminSettingsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_SETTINGS_RECEPTIONIST,
            element: (
              <LazyRoute>
                <AdminSettingsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_SETTINGS_LAB,
            element: (
              <LazyRoute>
                <AdminSettingsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_SETTINGS_NURSE,
            element: (
              <LazyRoute>
                <AdminSettingsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_SETTINGS_PHARMACY,
            element: (
              <LazyRoute>
                <AdminSettingsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.ADMIN_PROFILE,
            element: (
              <LazyRoute>
                <AdminProfilePage />
              </LazyRoute>
            ),
          },
          {
            path: '/admin',
            element: <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />,
          },
          {
            path: '/admin/*',
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
