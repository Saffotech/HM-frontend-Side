import { lazy } from 'react';

import ProtectedRoute from '@/components/security/ProtectedRoute';

import NurseAppShell from '@/features/nurse/components/NurseAppShell';

import { ROUTES, ROLES } from '@/shared/constants';

import LazyRoute from '@/routes/LazyRoute';



const NurseDashboardPage = lazy(() => import('@/features/nurse/pages/NurseDashboardPage'));

const NurseMyDutyPage = lazy(() => import('@/features/nurse/pages/NurseMyDutyPage'));

const NurseQueuePage = lazy(() => import('@/features/nurse/pages/NurseQueuePage'));

const NursePatientOverviewPage = lazy(() => import('@/features/nurse/pages/NursePatientOverviewPage'));

const NursePatientVitalsTimelinePage = lazy(() => import('@/features/nurse/pages/NursePatientVitalsTimelinePage'));

const NursePatientNotesTimelinePage = lazy(() => import('@/features/nurse/pages/NursePatientNotesTimelinePage'));

const NurseVitalsRegistryPage = lazy(() => import('@/features/nurse/pages/NurseVitalsRegistryPage'));

const NurseRecordVitalsPage = lazy(() => import('@/features/nurse/pages/NurseRecordVitalsPage'));

const NurseVitalDetailPage = lazy(() => import('@/features/nurse/pages/NurseVitalDetailPage'));

const NurseEditVitalsPage = lazy(() => import('@/features/nurse/pages/NurseEditVitalsPage'));

const NurseNotesRegistryPage = lazy(() => import('@/features/nurse/pages/NurseNotesRegistryPage'));

const NurseCreateNotePage = lazy(() => import('@/features/nurse/pages/NurseCreateNotePage'));

const NurseNoteDetailPage = lazy(() => import('@/features/nurse/pages/NurseNoteDetailPage'));

const NurseEditNotePage = lazy(() => import('@/features/nurse/pages/NurseEditNotePage'));

const NurseLabReportsRegistryPage = lazy(() => import('@/features/nurse/pages/NurseLabReportsRegistryPage'));

const NurseLabReportDetailPage = lazy(() => import('@/features/nurse/pages/NurseLabReportDetailPage'));

const NurseMedicationPatientsPage = lazy(() => import('@/features/nurse/pages/NurseMedicationPatientsPage'));

const NursePatientMedicationsPage = lazy(() => import('@/features/nurse/pages/NursePatientMedicationsPage'));

const NurseMedicationHistoryPage = lazy(() => import('@/features/nurse/pages/NurseMedicationHistoryPage'));

const NursePatientMedHistoryPage = lazy(() => import('@/features/nurse/pages/NursePatientMedHistoryPage'));

const NurseHandoverListPage = lazy(() => import('@/features/nurse/pages/NurseHandoverListPage'));

const NurseHandoverCreatePage = lazy(() => import('@/features/nurse/pages/NurseHandoverCreatePage'));

const NurseHandoverDetailPage = lazy(() => import('@/features/nurse/pages/NurseHandoverDetailPage'));

const NurseProfilePage = lazy(() => import('@/features/nurse/pages/NurseProfilePage'));

const NurseNotificationsPage = lazy(() => import('@/features/nurse/pages/NurseNotificationsPage'));
const NurseDoctorVisitsPage = lazy(() => import('@/features/nurse/pages/NurseDoctorVisitsPage'));
const NursePatientVisitHistoryPage = lazy(() => import('@/features/nurse/pages/NursePatientVisitHistoryPage'));

const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));



export const nurseRoutes = [

  {

    element: <ProtectedRoute allowedRoles={[ROLES.NURSE]} />,

    children: [

      {

        element: <NurseAppShell />,

        children: [

          { path: ROUTES.NURSE_DASHBOARD, element: <LazyRoute><NurseDashboardPage /></LazyRoute> },

          { path: ROUTES.NURSE_MY_DUTY, element: <LazyRoute><NurseMyDutyPage /></LazyRoute> },

          { path: ROUTES.NURSE_QUEUE, element: <LazyRoute><NurseQueuePage /></LazyRoute> },

          { path: ROUTES.NURSE_PATIENT, element: <LazyRoute><NursePatientOverviewPage /></LazyRoute> },

          { path: ROUTES.NURSE_PATIENT_VITALS, element: <LazyRoute><NursePatientVitalsTimelinePage /></LazyRoute> },

          { path: ROUTES.NURSE_PATIENT_NOTES, element: <LazyRoute><NursePatientNotesTimelinePage /></LazyRoute> },

          { path: ROUTES.NURSE_VITALS, element: <LazyRoute><NurseVitalsRegistryPage /></LazyRoute> },

          { path: ROUTES.NURSE_VITALS_NEW, element: <LazyRoute><NurseRecordVitalsPage /></LazyRoute> },

          { path: ROUTES.NURSE_VITAL_DETAIL, element: <LazyRoute><NurseVitalDetailPage /></LazyRoute> },

          { path: ROUTES.NURSE_VITAL_EDIT, element: <LazyRoute><NurseEditVitalsPage /></LazyRoute> },

          { path: ROUTES.NURSE_NOTES, element: <LazyRoute><NurseNotesRegistryPage /></LazyRoute> },

          { path: ROUTES.NURSE_NOTES_NEW, element: <LazyRoute><NurseCreateNotePage /></LazyRoute> },

          { path: ROUTES.NURSE_NOTE_DETAIL, element: <LazyRoute><NurseNoteDetailPage /></LazyRoute> },

          { path: ROUTES.NURSE_NOTE_EDIT, element: <LazyRoute><NurseEditNotePage /></LazyRoute> },

          { path: ROUTES.NURSE_LAB_REPORTS, element: <LazyRoute><NurseLabReportsRegistryPage /></LazyRoute> },

          { path: ROUTES.NURSE_LAB_REPORT_DETAIL, element: <LazyRoute><NurseLabReportDetailPage /></LazyRoute> },

          { path: ROUTES.NURSE_MEDICATIONS, element: <LazyRoute><NurseMedicationPatientsPage /></LazyRoute> },

          { path: ROUTES.NURSE_MEDICATIONS_PATIENT, element: <LazyRoute><NursePatientMedicationsPage /></LazyRoute> },

          { path: ROUTES.NURSE_MEDICATIONS_HISTORY, element: <LazyRoute><NurseMedicationHistoryPage /></LazyRoute> },

          { path: ROUTES.NURSE_MEDICATIONS_PATIENT_HISTORY, element: <LazyRoute><NursePatientMedHistoryPage /></LazyRoute> },

          { path: ROUTES.NURSE_HANDOVER, element: <LazyRoute><NurseHandoverListPage /></LazyRoute> },

          { path: ROUTES.NURSE_HANDOVER_NEW, element: <LazyRoute><NurseHandoverCreatePage /></LazyRoute> },

          { path: ROUTES.NURSE_HANDOVER_DETAIL, element: <LazyRoute><NurseHandoverDetailPage /></LazyRoute> },

          { path: ROUTES.NURSE_PROFILE, element: <LazyRoute><NurseProfilePage /></LazyRoute> },

          { path: ROUTES.NURSE_NOTIFICATIONS, element: <LazyRoute><NurseNotificationsPage /></LazyRoute> },
          { path: ROUTES.NURSE_DOCTOR_VISITS, element: <LazyRoute><NurseDoctorVisitsPage /></LazyRoute> },
          { path: ROUTES.NURSE_DOCTOR_VISITS_PATIENT, element: <LazyRoute><NursePatientVisitHistoryPage /></LazyRoute> },

          { path: '*', element: <LazyRoute><NotFoundPage /></LazyRoute> },

        ],

      },

    ],

  },

];


