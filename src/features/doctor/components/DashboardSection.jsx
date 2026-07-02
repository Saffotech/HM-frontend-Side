import { useMemo, useState, memo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  Check,
  Clock,
  XCircle,
} from 'lucide-react';

import {

  useDoctorDashboardTodayAppointmentsQuery,

} from '@/features/doctor/hooks/useDoctorAppointmentQuery';

import {
  useDoctorDashboardTodayQueueQuery,
  useRequestNextPatientMutation,
} from '@/features/doctor/hooks/useDoctorQueueQuery';

import {

  compareAppointmentsByDateTime,

} from '@/features/doctor/utils/doctorDates';

import {
  DASHBOARD_PREVIEW_LIMIT,
  PATIENT_CATEGORY_FILTER,
  dedupeAppointmentsByPatient,
} from '@/features/doctor/utils/patientListFilters';

import {
  isConsultCompleted,
  isConsultCancelled,
  compareQueueOrder,
  isPendingConsultation,
} from '@/features/doctor/utils/appointmentWorkflow';

import { findQueueRowForAppointment } from '@/features/doctor/utils/queueWorkflow';

import { Button, Avatar } from '@/shared/components/common';
import Skeleton from '@/shared/components/common/Skeleton';

import { toast } from '@/shared/utils/toast';

import StatusPill from './StatusPill';

import DashboardFilterBar from './DashboardFilterBar';

import DashboardAppointmentsTable from './DashboardAppointmentsTable';

import DashboardModals from './DashboardModals';

import AppointmentDetailModal from './AppointmentDetailModal';

import PatientHistoryProfile from './PatientHistoryProfile';

import { appointmentToPatientSummary } from '@/shared/api/mappers/doctorPatientMapper';
import { doctorAppointmentsApi } from '@/shared/api/services';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { queryKeys } from '@/shared/api/queryKeys';
import { prefetchPatientProfileData } from '@/features/doctor/utils/doctorPatientProfileCache';

import '../styles/doctor-ui.css';

import './DashboardSection.css';



const DASHBOARD_FILTER = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

function comparePatientQueueDashboard(a, b, queueMetaByAppointmentId) {
  const aMeta = queueMetaByAppointmentId.get(a.dbId);
  const bMeta = queueMetaByAppointmentId.get(b.dbId);
  const aInQueue = Boolean(aMeta);
  const bInQueue = Boolean(bMeta);

  if (aInQueue && bInQueue) {
    return (bMeta.tokenNumber ?? 0) - (aMeta.tokenNumber ?? 0);
  }
  if (aInQueue !== bInQueue) return aInQueue ? -1 : 1;

  return compareAppointmentsByDateTime(a, b);
}

function appointmentToQueueItem(appt, todayQueue) {
  const queueRow = findQueueRowForAppointment(todayQueue, appt.dbId);
  return {
    queueId: queueRow?.queueId ?? null,
    appointmentId: appt.dbId,
    patientName: appt.patientName,
    patientUid: appt.patientUid ?? appt.patientId,
    tokenNumber: queueRow?.tokenNumber ?? null,
    time: appt.time,
    scheduledAt: appt.scheduledAt,
    reason: appt.reason,
    status: queueRow?.status ?? appt.status,
    type: appt.type,
    dbId: appt.dbId,
    appointment: appt,
  };
}

function DashboardSection({ onViewAllPatients }) {

  const token = useQueryToken();
  const queryClient = useQueryClient();

  const { data: todayAppointments = [], isPending: isTodayPending } =
    useDoctorDashboardTodayAppointmentsQuery();

  const { data: todayQueue = [], isPending: isQueuePending } =
    useDoctorDashboardTodayQueueQuery();

  const isDashboardInitialLoad = isTodayPending || isQueuePending;

  const requestNextMut = useRequestNextPatientMutation();

  const [consultFor, setConsultFor] = useState(null);

  const [profilePatient, setProfilePatient] = useState(null);

  const [rxFor, setRxFor] = useState(null);

  const [rxAppointment, setRxAppointment] = useState(null);

  const [notesFor, setNotesFor] = useState(null);

  const [viewAppointmentDbId, setViewAppointmentDbId] = useState(null);

  const [startingConsult, setStartingConsult] = useState(false);

  const [activeFilter, setActiveFilter] = useState(DASHBOARD_FILTER.SCHEDULED);



  const todaysAll = todayAppointments;

  const todaysActive = useMemo(

    () => [...todaysAll.filter((a) => !isConsultCompleted(a) && !isConsultCancelled(a))].sort(compareQueueOrder),

    [todaysAll]

  );



  const queueMetaByAppointmentId = useMemo(
    () =>
      new Map(
        todayQueue.map((q) => [
          q.appointmentId,
          { tokenNumber: q.tokenNumber ?? 0, queueId: q.queueId },
        ])
      ),
    [todayQueue]
  );

  const queuePanelList = useMemo(
    () =>
      [...todaysActive]
        .sort(compareAppointmentsByDateTime)
        .map((appt) => appointmentToQueueItem(appt, todayQueue)),
    [todaysActive, todayQueue]
  );

  const nextQueueCandidate = useMemo(() => {
    return (
      queuePanelList.find((item) => isPendingConsultation(item.appointment)) ?? null
    );
  }, [queuePanelList]);

  const pendingConsultations = useMemo(
    () => todaysActive.filter(isPendingConsultation),
    [todaysActive]
  );

  const { completed, cancelledLocal } = useMemo(() => {
    const completedList = [];
    let cancelled = 0;

    for (const appointment of todaysAll) {
      if (isConsultCompleted(appointment)) {
        completedList.push(appointment);
      } else if (appointment.status === 'Cancelled') {
        cancelled += 1;
      }
    }

    return {
      completed: completedList,
      cancelledLocal: cancelled,
    };
  }, [todaysAll]);

  const filteredByCard = useMemo(() => {
    let list;
    switch (activeFilter) {
      case DASHBOARD_FILTER.COMPLETED:
        list = dedupeAppointmentsByPatient(completed);
        break;
      case DASHBOARD_FILTER.CANCELLED:
        list = todaysAll.filter(isConsultCancelled);
        break;
      case DASHBOARD_FILTER.SCHEDULED:
      default:
        list = pendingConsultations;
        break;
    }
    const sorted = [...list];
    if (activeFilter === DASHBOARD_FILTER.SCHEDULED) {
      sorted.sort((a, b) => comparePatientQueueDashboard(a, b, queueMetaByAppointmentId));
    } else {
      sorted.sort(compareAppointmentsByDateTime);
    }
    return sorted;
  }, [activeFilter, completed, pendingConsultations, todaysAll, queueMetaByAppointmentId]);

  const queueTableTitle = useMemo(() => {
    switch (activeFilter) {
      case DASHBOARD_FILTER.COMPLETED:
        return 'Completed Consultations';
      case DASHBOARD_FILTER.CANCELLED:
        return 'Cancelled Appointments';
      case DASHBOARD_FILTER.SCHEDULED:
      default:
        return "Today's Appointments";
    }
  }, [activeFilter]);

  const queueEmptyMessage = useMemo(() => {
    switch (activeFilter) {
      case DASHBOARD_FILTER.COMPLETED:
        return 'No completed consultations today.';
      case DASHBOARD_FILTER.CANCELLED:
        return 'No cancelled appointments today.';
      case DASHBOARD_FILTER.SCHEDULED:
      default:
        return 'No scheduled appointments for today.';
    }
  }, [activeFilter]);



  const recentPatients = useMemo(() => {
    const uniqueCompleted = dedupeAppointmentsByPatient(
      todayAppointments.filter((a) => a.status === 'Completed')
    );
    return uniqueCompleted
      .slice(0, DASHBOARD_PREVIEW_LIMIT)
      .map((a) => appointmentToPatientSummary(a));
  }, [todayAppointments]);



  const summary = useMemo(
    () => [
      {
        filter: DASHBOARD_FILTER.SCHEDULED,
        label: 'Scheduled Today',
        value: pendingConsultations.length,
        icon: Clock,
        tint: 'doc-stat-icon--amber',
      },
      {
        filter: DASHBOARD_FILTER.COMPLETED,
        label: 'Completed Consultations',
        value: completed.length,
        icon: Check,
        tint: 'doc-stat-icon--green',
      },
      {
        filter: DASHBOARD_FILTER.CANCELLED,
        label: 'Cancelled',
        value: cancelledLocal,
        icon: XCircle,
        tint: 'doc-stat-icon--violet',
      },
    ],
    [pendingConsultations.length, completed.length, cancelledLocal]
  );



  const dashboardQueuePreview = useMemo(
    () => filteredByCard.slice(0, DASHBOARD_PREVIEW_LIMIT),
    [filteredByCard]
  );

  const dashboardRecentPreview = useMemo(
    () => recentPatients.slice(0, DASHBOARD_PREVIEW_LIMIT),
    [recentPatients]
  );

  const beginConsultation = useCallback(async (appt) => {
    if (appt.dbId == null) {
      toast.error('Appointment id missing — cannot open consultation');
      return;
    }

    setStartingConsult(true);
    try {
      const patientUid = appt.patientUid ?? appt.patientId;
      const patientDbId = appt.patientDbId ?? appt.patientId;

      await Promise.all([
        prefetchPatientProfileData(queryClient, token, {
          patientUid,
          patientId: patientDbId,
        }),
        queryClient.prefetchQuery({
          queryKey: queryKeys.doctor.appointments.detail(appt.dbId),
          queryFn: () => doctorAppointmentsApi.fetchAppointmentById(appt.dbId, token),
        }),
      ]);

      const queueRow = findQueueRowForAppointment(todayQueue, appt.dbId);

      setConsultFor({
        ...appt,
        queueId: queueRow?.queueId ?? null,
        queueRow: queueRow ?? null,
      });
    } catch (err) {
      toast.error(err?.message ?? 'Could not open consultation');
    } finally {
      setStartingConsult(false);
    }
  }, [todayQueue, queryClient, token]);



  const requestNextPatient = useCallback(async () => {

    if (!nextQueueCandidate?.appointment?.dbId) {

      toast.error('No scheduled patients to call next');

      return;

    }

    try {

      await requestNextMut.mutateAsync(nextQueueCandidate.appointment.dbId);

      toast.success(

        `Next patient notified to reception: ${nextQueueCandidate.appointment.patientName}`

      );

    } catch (err) {

      toast.error(err?.message ?? 'Could not send next-patient request');

    }

  }, [nextQueueCandidate, requestNextMut]);

  const handleOpenPatient = useCallback((patientSummary) => {
    void prefetchPatientProfileData(queryClient, token, {
      patientUid: patientSummary?.patientUid ?? patientSummary?.id,
      patientId: patientSummary?.patientId,
    });
    setProfilePatient(patientSummary);
  }, [queryClient, token]);

  const handlePrescribe = useCallback((p, appt) => {
    setRxFor(p);
    setRxAppointment(appt);
  }, []);

  const handleViewAllFromFilter = useCallback(() => {
    const category =
      activeFilter === DASHBOARD_FILTER.COMPLETED
        ? PATIENT_CATEGORY_FILTER.COMPLETED
        : activeFilter === DASHBOARD_FILTER.CANCELLED
          ? PATIENT_CATEGORY_FILTER.CANCELLED
          : PATIENT_CATEGORY_FILTER.QUEUE;
    onViewAllPatients?.(category);
  }, [activeFilter, onViewAllPatients]);

  const queueHeaderActions = useMemo(() => {
    if (activeFilter === DASHBOARD_FILTER.SCHEDULED) {
      return (
        <>
          <span className="doc-pill doc-pill--muted">
            {isDashboardInitialLoad ? (
              <Skeleton width={72} height={18} />
            ) : (
              `${pendingConsultations.length} scheduled`
            )}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={!nextQueueCandidate || requestNextMut.isPending || isDashboardInitialLoad}
            onClick={requestNextPatient}
          >
            Next
          </Button>
          <button
            type="button"
            className="doc-view-all-link"
            onClick={() => onViewAllPatients?.(PATIENT_CATEGORY_FILTER.QUEUE)}
          >
            View all
          </button>
        </>
      );
    }

    return (
      <button
        type="button"
        className="doc-view-all-link"
        onClick={handleViewAllFromFilter}
      >
        View all
      </button>
    );
  }, [
    activeFilter,
    pendingConsultations.length,
    isDashboardInitialLoad,
    nextQueueCandidate,
    requestNextMut.isPending,
    requestNextPatient,
    onViewAllPatients,
    handleViewAllFromFilter,
  ]);



  if (profilePatient) {
    return (
      <PatientHistoryProfile
        patient={profilePatient}
        onBack={() => setProfilePatient(null)}
        backLabel="Back to Dashboard"
      />
    );
  }



  return (

    <div className="doc-page doc-dashboard">

      <DashboardFilterBar

        summary={summary}

        activeFilter={activeFilter}

        onFilterChange={setActiveFilter}

        isLoading={isDashboardInitialLoad}

      />



      <div className="doc-dashboard-grid">

        <div className="doc-dashboard-main">

          <DashboardAppointmentsTable

            title={queueTableTitle}

            emptyMessage={queueEmptyMessage}

            headerActions={queueHeaderActions}

            filteredAppointments={dashboardQueuePreview}

            isLoading={isDashboardInitialLoad}

            showActions={activeFilter === DASHBOARD_FILTER.SCHEDULED}
            actionMode="consult"

            startingConsult={startingConsult}

            onBeginConsultation={beginConsultation}

            onOpenPatient={handleOpenPatient}

            onPrescribe={handlePrescribe}

            onOpenNotes={setNotesFor}

          />

        </div>



        <div className="doc-dashboard-recent doc-card">

          <div className="doc-card__head doc-queue-card__head">

            <h3 className="doc-card__title">Recent Patients</h3>

            <button
              type="button"
              className="doc-view-all-link"
              onClick={() => onViewAllPatients?.(PATIENT_CATEGORY_FILTER.COMPLETED)}
            >
              View all
            </button>

          </div>

          <div className="doc-card__body doc-dashboard-recent-body">

            {isDashboardInitialLoad ? (
              <div className="doc-dashboard-recent-track" aria-busy="true" aria-label="Loading recent patients">
                {Array.from({ length: 3 }).map((_, index) => (
                  <article key={index} className="doc-recent-card doc-recent-card--skeleton">
                    <Skeleton circle width={40} height={40} />
                    <div className="doc-recent-card__info doc-recent-card__info--skeleton">
                      <Skeleton height={14} width="75%" />
                      <Skeleton height={12} width="55%" />
                    </div>
                  </article>
                ))}
              </div>
            ) : dashboardRecentPreview.length === 0 ? (

              <p className="doc-dashboard-empty doc-dashboard-empty--sm">No completed consultations yet.</p>

            ) : (

              <div className="doc-dashboard-recent-track">

                {dashboardRecentPreview.map((p) => (
                  <article
                    key={p.patientUid ?? p.id}
                    className="doc-recent-card doc-recent-card--clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenPatient(p)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenPatient(p);
                      }
                    }}
                  >
                    <Avatar name={p.name} size={40} />

                    <div className="doc-recent-card__info">

                      <strong className="doc-recent-card__name">{p.name}</strong>

                      <span className="text-muted">

                        {p.patientUid ?? p.id} · {p.age ?? '—'}y · {p.gender}

                      </span>

                    </div>
                  </article>
                ))}

              </div>

            )}

          </div>

        </div>

      </div>



      <DashboardModals
        consultFor={consultFor}
        todayQueue={todayQueue}
        onCloseConsult={() => setConsultFor(null)}
        rxFor={rxFor}

        rxAppointment={rxAppointment}

        onClosePrescribe={() => {

          setRxFor(null);

          setRxAppointment(null);

        }}

        notesFor={notesFor}

        onCloseNotes={() => setNotesFor(null)}

      />

      <AppointmentDetailModal

        appointmentDbId={viewAppointmentDbId}

        open={viewAppointmentDbId != null}

        onClose={() => setViewAppointmentDbId(null)}

      />

    </div>

  );

}



export default memo(DashboardSection);

