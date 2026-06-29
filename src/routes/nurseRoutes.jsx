import { lazy } from 'react';

import ProtectedRoute from '@/components/security/ProtectedRoute';

import NurseAppShell from '@/features/nurse/components/NurseAppShell';

import { ROUTES, ROLES } from '@/shared/constants';

import LazyRoute from '@/routes/LazyRoute';



const NurseDashboardPage = lazy(() => import('@/features/nurse/pages/NurseDashboardPage'));

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

const NurseMedicationPatientsPage = lazy(() => import('@/features/nurse/pages/NurseMedicationPatientsPage'));

const NursePatientMedicationsPage = lazy(() => import('@/features/nurse/pages/NursePatientMedicationsPage'));

const NurseMedicationHistoryPage = lazy(() => import('@/features/nurse/pages/NurseMedicationHistoryPage'));

const NursePatientMedHistoryPage = lazy(() => import('@/features/nurse/pages/NursePatientMedHistoryPage'));

const NurseHandoverListPage = lazy(() => import('@/features/nurse/pages/NurseHandoverListPage'));

const NurseHandoverCreatePage = lazy(() => import('@/features/nurse/pages/NurseHandoverCreatePage'));

const NurseHandoverDetailPage = lazy(() => import('@/features/nurse/pages/NurseHandoverDetailPage'));

const NurseAlertsPage = lazy(() => import('@/features/nurse/pages/NurseAlertsPage'));

const NurseCreateAlertPage = lazy(() => import('@/features/nurse/pages/NurseCreateAlertPage'));

const NurseAlertDetailPage = lazy(() => import('@/features/nurse/pages/NurseAlertDetailPage'));

const NurseProfilePage = lazy(() => import('@/features/nurse/pages/NurseProfilePage'));

const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));



export const nurseRoutes = [

  {

    element: <ProtectedRoute allowedRoles={[ROLES.NURSE]} />,

    children: [

      {

        element: <NurseAppShell />,

        children: [

          { path: ROUTES.NURSE_DASHBOARD, element: <LazyRoute><NurseDashboardPage /></LazyRoute> },

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

          { path: ROUTES.NURSE_MEDICATIONS, element: <LazyRoute><NurseMedicationPatientsPage /></LazyRoute> },

          { path: ROUTES.NURSE_MEDICATIONS_PATIENT, element: <LazyRoute><NursePatientMedicationsPage /></LazyRoute> },

          { path: ROUTES.NURSE_MEDICATIONS_HISTORY, element: <LazyRoute><NurseMedicationHistoryPage /></LazyRoute> },

          { path: ROUTES.NURSE_MEDICATIONS_PATIENT_HISTORY, element: <LazyRoute><NursePatientMedHistoryPage /></LazyRoute> },

          { path: ROUTES.NURSE_HANDOVER, element: <LazyRoute><NurseHandoverListPage /></LazyRoute> },

          { path: ROUTES.NURSE_HANDOVER_NEW, element: <LazyRoute><NurseHandoverCreatePage /></LazyRoute> },

          { path: ROUTES.NURSE_HANDOVER_DETAIL, element: <LazyRoute><NurseHandoverDetailPage /></LazyRoute> },

          { path: ROUTES.NURSE_ALERTS, element: <LazyRoute><NurseAlertsPage /></LazyRoute> },

          { path: ROUTES.NURSE_ALERTS_NEW, element: <LazyRoute><NurseCreateAlertPage /></LazyRoute> },

          { path: ROUTES.NURSE_ALERT_DETAIL, element: <LazyRoute><NurseAlertDetailPage /></LazyRoute> },

          { path: ROUTES.NURSE_PROFILE, element: <LazyRoute><NurseProfilePage /></LazyRoute> },

          { path: '*', element: <LazyRoute><NotFoundPage /></LazyRoute> },

        ],

      },

    ],

  },

];


