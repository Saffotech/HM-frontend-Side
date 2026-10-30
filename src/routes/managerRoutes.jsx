import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/security/ProtectedRoute';
import ManagerAppShell from '@/features/manager/components/ManagerAppShell';
import { ROUTES, ROLES } from '@/shared/constants';
import LazyRoute from '@/routes/LazyRoute';

const ManagerDashboardPage = lazy(() => import('@/features/manager/pages/ManagerDashboardPage'));
const StaffListPage = lazy(() => import('@/features/manager/pages/StaffListPage'));
const StaffDetailPage = lazy(() => import('@/features/manager/pages/StaffDetailPage'));
const StaffRegisterPage = lazy(() => import('@/features/manager/pages/StaffRegisterPage'));
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
const ManagerSettingsPage = lazy(() => import('@/features/manager/pages/ManagerSettingsPage'));
const ManagerProfilePage = lazy(() => import('@/features/manager/pages/ManagerProfilePage'));
const ManagerNotificationsPage = lazy(() => import('@/features/manager/pages/ManagerNotificationsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export const managerRoutes = [
  {
    element: <ProtectedRoute allowedRoles={[ROLES.MANAGER]} />,
    children: [
      {
        element: <ManagerAppShell />,
        children: [
          {
            path: ROUTES.MANAGER_DASHBOARD,
            element: (
              <LazyRoute>
                <ManagerDashboardPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.MANAGER_STAFF,
            element: (
              <LazyRoute>
                <StaffListPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.MANAGER_STAFF_NEW,
            element: (
              <LazyRoute>
                <StaffRegisterPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.MANAGER_STAFF_DETAIL,
            element: (
              <LazyRoute>
                <StaffDetailPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.MANAGER_BED_ALLOCATION,
            element: (
              <LazyRoute>
                <NurseBedAllocationListPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.MANAGER_BED_ALLOCATION_NEW,
            element: (
              <LazyRoute>
                <NurseBedAllocationCreatePage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.MANAGER_BED_ALLOCATION_EDIT,
            element: (
              <LazyRoute>
                <NurseBedAllocationEditPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.MANAGER_BED_ALLOCATION_DETAIL,
            element: (
              <LazyRoute>
                <NurseBedAllocationDetailPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.MANAGER_NURSE_WORKFORCE,
            element: (
              <LazyRoute>
                <NurseWorkforceDashboardPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.MANAGER_NURSE_WORKFORCE_SHIFTS,
            element: (
              <LazyRoute>
                <NurseWorkforceShiftsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.MANAGER_NURSE_WORKFORCE_ROSTER,
            element: (
              <LazyRoute>
                <NurseWorkforceRosterPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.MANAGER_ROLES,
            element: <Navigate to={ROUTES.MANAGER_DASHBOARD} replace />,
          },
          {
            path: ROUTES.MANAGER_DEPARTMENTS,
            element: (
              <LazyRoute>
                <DepartmentListPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.MANAGER_DEPARTMENTS_NEW,
            element: (
              <LazyRoute>
                <DepartmentCreatePage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.MANAGER_DEPARTMENT_DETAIL,
            element: (
              <LazyRoute>
                <DepartmentDetailPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.MANAGER_REPORTS,
            element: (
              <LazyRoute>
                <ReportsOverviewPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.MANAGER_REPORTS_VISITS,
            element: (
              <LazyRoute>
                <VisitsReportPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.MANAGER_SETTINGS,
            element: <Navigate to={ROUTES.MANAGER_SETTINGS_OPD} replace />,
          },
          {
            path: ROUTES.MANAGER_SETTINGS_OPD,
            element: (
              <LazyRoute>
                <ManagerSettingsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.MANAGER_SETTINGS_DOCTOR,
            element: (
              <LazyRoute>
                <ManagerSettingsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.MANAGER_SETTINGS_RECEPTIONIST,
            element: (
              <LazyRoute>
                <ManagerSettingsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.MANAGER_SETTINGS_LAB,
            element: (
              <LazyRoute>
                <ManagerSettingsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.MANAGER_SETTINGS_NURSE,
            element: (
              <LazyRoute>
                <ManagerSettingsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.MANAGER_SETTINGS_PHARMACY,
            element: (
              <LazyRoute>
                <ManagerSettingsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.MANAGER_NOTIFICATIONS,
            element: (
              <LazyRoute>
                <ManagerNotificationsPage />
              </LazyRoute>
            ),
          },
          {
            path: ROUTES.MANAGER_PROFILE,
            element: (
              <LazyRoute>
                <ManagerProfilePage />
              </LazyRoute>
            ),
          },
          {
            path: '/manager',
            element: <Navigate to={ROUTES.MANAGER_DASHBOARD} replace />,
          },
          {
            path: '/manager/*',
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
