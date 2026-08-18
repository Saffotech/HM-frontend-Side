import { useMemo, useState, memo, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  Check,
  Clock,
  Search,
  XCircle,
  BedDouble,
  LogOut,
  X,
} from 'lucide-react';

import {

  useDoctorDashboardTodayAppointmentsQuery,

} from '@/features/doctor/hooks/useDoctorAppointmentQuery';

import { useDoctorDashboardTodayQueueQuery } from '@/features/doctor/hooks/useDoctorQueueQuery';
import { useDoctorIpdAdmissionsQuery } from '@/features/doctor/hooks/useDoctorIpdQuery';
import { isIpdEncounter, DOCTOR_ENCOUNTER_MODE } from '@/features/doctor/utils/encounterType';

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

import { Avatar } from '@/shared/components/common';
import { formatPatientAge } from '@/features/doctor/utils/formatPatientAge';
import Skeleton from '@/shared/components/common/Skeleton';

import { toast } from '@/shared/utils/toast';

import DashboardFilterBar from './DashboardFilterBar';

import DashboardAppointmentsTable from './DashboardAppointmentsTable';
import DoctorIpdPatientsTable from './DoctorIpdPatientsTable';

import DashboardModals from './DashboardModals';

import AppointmentDetailModal from './AppointmentDetailModal';

import PatientHistoryProfile from './PatientHistoryProfile';

import { appointmentToPatientSummary } from '@/shared/api/mappers/doctorPatientMapper';
import { doctorConsultationsApi } from '@/shared/api/services';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { queryKeys } from '@/shared/api/queryKeys';
import { prefetchPatientProfileData } from '@/features/doctor/utils/doctorPatientProfileCache';
import { invalidateDoctorAppointmentStatusChange } from '@/features/doctor/utils/doctorDashboardCache';
import { useCancelAppointmentMutation } from '@/shared/hooks/queries/useAppointmentQuery';

import '../styles/doctor-ui.css';

import './DashboardSection.css';



const DASHBOARD_FILTER = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const IPD_STATUS_FILTER = {
  ADMITTED: 'admitted',
  DISCHARGED: 'discharged',
};

const IPD_PAGE_SIZE = 20;

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

function DashboardSection({ encounterMode = DOCTOR_ENCOUNTER_MODE.OPD, onViewAllPatients }) {

  const token = useQueryToken();
  const queryClient = useQueryClient();

  const { data: todayAppointments = [], isPending: isTodayPending } =
    useDoctorDashboardTodayAppointmentsQuery();

  const { data: todayQueue = [], isPending: isQueuePending } =
    useDoctorDashboardTodayQueueQuery();

  const isDashboardInitialLoad = isTodayPending || isQueuePending;

  const [consultFor, setConsultFor] = useState(null);

  const [profilePatient, setProfilePatient] = useState(null);

  const [rxFor, setRxFor] = useState(null);

  const [rxAppointment, setRxAppointment] = useState(null);

  const [notesFor, setNotesFor] = useState(null);

  const [viewAppointmentDbId, setViewAppointmentDbId] = useState(null);

  const [startingConsult, setStartingConsult] = useState(false);

  const cancelAppointment = useCancelAppointmentMutation();

  const [activeFilter, setActiveFilter] = useState(DASHBOARD_FILTER.SCHEDULED);
  const [ipdStatusFilter, setIpdStatusFilter] = useState(IPD_STATUS_FILTER.ADMITTED);
  const [ipdSearch, setIpdSearch] = useState('');
  const [ipdFromDate, setIpdFromDate] = useState('');
  const [ipdToDate, setIpdToDate] = useState('');
  const [ipdPage, setIpdPage] = useState(1);
  const [patientIdSearch, setPatientIdSearch] = useState('');
  const patientIdQuery = patientIdSearch.trim().toLowerCase();

  const ipdQueryParams = useMemo(
    () => ({
      status: ipdStatusFilter,
      search: ipdSearch.trim() || undefined,
      from_date: ipdFromDate || undefined,
      to_date: ipdToDate || undefined,
      page: ipdPage,
      page_size: IPD_PAGE_SIZE,
    }),
    [ipdStatusFilter, ipdSearch, ipdFromDate, ipdToDate, ipdPage],
  );

  const ipdSecondaryStatus =
    ipdStatusFilter === IPD_STATUS_FILTER.ADMITTED
      ? IPD_STATUS_FILTER.DISCHARGED
      : IPD_STATUS_FILTER.ADMITTED;

  const ipdCountQueryParams = useMemo(
    () => ({
      status: ipdSecondaryStatus,
      search: ipdSearch.trim() || undefined,
      from_date: ipdFromDate || undefined,
      to_date: ipdToDate || undefined,
      page: 1,
      page_size: 1,
    }),
    [ipdSecondaryStatus, ipdSearch, ipdFromDate, ipdToDate],
  );

  const isIpdMode = encounterMode === DOCTOR_ENCOUNTER_MODE.IPD;

  const { data: ipdData, isPending: isIpdPending } = useDoctorIpdAdmissionsQuery(
    ipdQueryParams,
    { enabled: isIpdMode },
  );

  const { data: ipdSecondaryData, isPending: isIpdSecondaryPending } =
    useDoctorIpdAdmissionsQuery(ipdCountQueryParams, { enabled: isIpdMode });

  useEffect(() => {
    setIpdPage(1);
  }, [ipdStatusFilter, ipdSearch, ipdFromDate, ipdToDate]);

  const todaysAll = useMemo(
    () => todayAppointments.filter((a) => !isIpdEncounter(a)),
    [todayAppointments],
  );

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
    if (patientIdQuery) {
      return `No appointments match patient ID "${patientIdSearch.trim()}".`;
    }
    switch (activeFilter) {
      case DASHBOARD_FILTER.COMPLETED:
        return 'No completed consultations today.';
      case DASHBOARD_FILTER.CANCELLED:
        return 'No cancelled appointments today.';
      case DASHBOARD_FILTER.SCHEDULED:
      default:
        return 'No scheduled appointments for today.';
    }
  }, [activeFilter, patientIdQuery, patientIdSearch]);

  const patientIdSearchField = (
    <label className="doc-queue-card__patient-search">
      <Search size={14} className="doc-queue-card__patient-search-icon" aria-hidden />
      <input
        type="search"
        className="doc-queue-card__patient-search-input"
        value={patientIdSearch}
        onChange={(e) => setPatientIdSearch(e.target.value)}
        placeholder="Search patient ID…"
        aria-label="Search today's appointments by patient ID"
      />
    </label>
  );


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



  const searchedByPatientId = useMemo(() => {
    if (!patientIdQuery) return filteredByCard;
    return filteredByCard.filter((appt) => {
      const uid = String(appt.patientUid ?? '').toLowerCase();
      const id = String(appt.patientId ?? '').toLowerCase();
      return uid.includes(patientIdQuery) || id.includes(patientIdQuery);
    });
  }, [filteredByCard, patientIdQuery]);

  const dashboardQueuePreview = useMemo(
    () =>
      patientIdQuery
        ? searchedByPatientId
        : searchedByPatientId.slice(0, DASHBOARD_PREVIEW_LIMIT),
    [searchedByPatientId, patientIdQuery]
  );

  const dashboardRecentPreview = useMemo(
    () => recentPatients.slice(0, DASHBOARD_PREVIEW_LIMIT),
    [recentPatients]
  );

  const beginIpdConsultation = useCallback(async (row) => {
    const admissionId = row.admissionId ?? row.admission_id;
    if (admissionId == null) {
      toast.error('Admission id missing — cannot open consultation');
      return;
    }

    setStartingConsult(true);
    try {
      const patientUid = row.patientUid ?? row.patientId;
      const patientDbId = row.patientDbId ?? row.patientId;

      await prefetchPatientProfileData(queryClient, token, {
        patientUid,
        patientId: patientDbId,
      });

      setConsultFor({
        ...row,
        encounterType: 'IPD',
        admissionId,
      });
    } catch (err) {
      toast.error(err?.message ?? 'Could not open consultation');
    } finally {
      setStartingConsult(false);
    }
  }, [queryClient, token]);

  const beginConsultation = useCallback(async (appt) => {
    if (isIpdEncounter(appt)) {
      await beginIpdConsultation(appt);
      return;
    }
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
          queryKey: queryKeys.doctor.consultations.context(appt.dbId),
          queryFn: () => doctorConsultationsApi.fetchConsultationContext(appt.dbId, token),
        }),
      ]);

      const context = queryClient.getQueryData(
        queryKeys.doctor.consultations.context(appt.dbId)
      );
      const queueRow =
        context?.queue ?? findQueueRowForAppointment(todayQueue, appt.dbId);

      setConsultFor({
        ...appt,
        ...(context?.appointment ?? {}),
        queueId: queueRow?.queueId ?? null,
        queueRow: queueRow ?? null,
      });
    } catch (err) {
      toast.error(err?.message ?? 'Could not open consultation');
    } finally {
      setStartingConsult(false);
    }
  }, [beginIpdConsultation, todayQueue, queryClient, token]);

  const handleCancelAppointment = useCallback(
    (appt) => {
      if (isIpdEncounter(appt)) {
        toast.error('Cancel is not available for IPD admissions');
        return;
      }
      const appointmentId = appt.dbId ?? appt.id;
      if (appointmentId == null) {
        toast.error('Appointment id missing — cannot cancel');
        return;
      }
      if (!window.confirm(`Cancel appointment for ${appt.patientName}?`)) return;

      cancelAppointment.mutate(appointmentId, {
        onSuccess: () => {
          invalidateDoctorAppointmentStatusChange(queryClient, appointmentId);
          toast.success('Appointment cancelled');
        },
      });
    },
    [cancelAppointment, queryClient],
  );

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
    onViewAllPatients,
    handleViewAllFromFilter,
  ]);



  const ipdSummary = useMemo(() => {
    const admittedTotal =
      ipdStatusFilter === IPD_STATUS_FILTER.ADMITTED
        ? (ipdData?.total ?? 0)
        : (ipdSecondaryData?.total ?? 0);
    const dischargedTotal =
      ipdStatusFilter === IPD_STATUS_FILTER.DISCHARGED
        ? (ipdData?.total ?? 0)
        : (ipdSecondaryData?.total ?? 0);

    return [
      {
        filter: IPD_STATUS_FILTER.ADMITTED,
        label: 'Admit',
        value: admittedTotal,
        icon: BedDouble,
        tint: 'doc-stat-icon--amber',
      },
      {
        filter: IPD_STATUS_FILTER.DISCHARGED,
        label: 'Discharge',
        value: dischargedTotal,
        icon: LogOut,
        tint: 'doc-stat-icon--green',
      },
    ];
  }, [ipdStatusFilter, ipdData?.total, ipdSecondaryData?.total]);

  const isIpdSummaryPending = isIpdPending || isIpdSecondaryPending;

  const ipdSearchField = (
    <label className="doc-queue-card__patient-search">
      <Search size={14} className="doc-queue-card__patient-search-icon" aria-hidden />
      <input
        type="search"
        className="doc-queue-card__patient-search-input"
        value={ipdSearch}
        onChange={(e) => setIpdSearch(e.target.value)}
        placeholder="Search name, UHID, phone, admission no…"
        aria-label="Search IPD patients"
      />
    </label>
  );

  const hasIpdDateFilter = Boolean(ipdFromDate || ipdToDate);

  const clearIpdDateFilters = useCallback(() => {
    setIpdFromDate('');
    setIpdToDate('');
  }, []);

  const ipdDateFilters = (
    <div className="doc-dashboard-ipd-dates">
      <label className="doc-dashboard-ipd-dates__field">
        <span>From</span>
        <input
          type="date"
          value={ipdFromDate}
          onChange={(e) => setIpdFromDate(e.target.value)}
          aria-label="Admit date from"
        />
      </label>
      <label className="doc-dashboard-ipd-dates__field">
        <span>To</span>
        <input
          type="date"
          value={ipdToDate}
          onChange={(e) => setIpdToDate(e.target.value)}
          aria-label="Admit date to"
        />
      </label>
      {hasIpdDateFilter ? (
        <button
          type="button"
          className="doc-dashboard-ipd-dates__clear"
          onClick={clearIpdDateFilters}
          aria-label="Clear date filters"
        >
          <X size={14} aria-hidden />
          Clear
        </button>
      ) : null}
    </div>
  );

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

      {encounterMode === DOCTOR_ENCOUNTER_MODE.OPD ? (
        <>
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

            titleExtra={patientIdSearchField}

            headerActions={queueHeaderActions}

            filteredAppointments={dashboardQueuePreview}

            isLoading={isDashboardInitialLoad}

            showActions={activeFilter === DASHBOARD_FILTER.SCHEDULED}
            actionMode="consult"

            startingConsult={startingConsult}

            cancellingAppointment={cancelAppointment.isPending}

            onBeginConsultation={beginConsultation}

            onCancelAppointment={handleCancelAppointment}

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

                        {p.patientUid ?? p.id} · {formatPatientAge({ age: p.age, dob: p.dob }) ?? '—'} · {p.gender}

                      </span>

                    </div>
                  </article>
                ))}

              </div>

            )}

          </div>

        </div>

      </div>
        </>
      ) : (
        <>
          <DashboardFilterBar
            summary={ipdSummary}
            activeFilter={ipdStatusFilter}
            onFilterChange={setIpdStatusFilter}
            isLoading={isIpdSummaryPending}
          />
          <DoctorIpdPatientsTable
            title={ipdStatusFilter === IPD_STATUS_FILTER.DISCHARGED ? 'Discharged IPD' : 'Admitted IPD'}
            emptyMessage={
              ipdSearch.trim()
                ? 'No IPD patients match your search.'
                : ipdStatusFilter === IPD_STATUS_FILTER.DISCHARGED
                  ? 'No discharged IPD patients for these filters.'
                  : 'No admitted IPD patients under you.'
            }
            titleExtra={ipdSearchField}
            headerEnd={ipdDateFilters}
            rows={ipdData?.items ?? []}
            isLoading={isIpdPending}
            page={ipdData?.page ?? ipdPage}
            pageSize={ipdData?.page_size ?? IPD_PAGE_SIZE}
            total={ipdData?.total ?? 0}
            onPageChange={setIpdPage}
            onOpenPatient={handleOpenPatient}
            showWardBedColumn
            showActions={ipdStatusFilter === IPD_STATUS_FILTER.ADMITTED}
            onConsult={beginIpdConsultation}
            startingConsult={startingConsult}
          />
        </>
      )}



      <DashboardModals
        consultFor={consultFor}
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

