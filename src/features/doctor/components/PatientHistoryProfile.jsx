import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Beaker,
  Droplet,
  Edit3,
  Eye,
  FileText,
  Phone,
  Pill,
  Plus,
  User,
} from 'lucide-react';
import {
  useDoctorPatientHistoryQuery,
  useDoctorPatientPrescriptionsQuery,
} from '@/features/doctor/hooks/useDoctorPatientQuery';
import PrescriptionDetailModal from './PrescriptionDetailModal';
import AddLabTestModal from './AddLabTestModal';
import { useDoctorLabTestsQuery } from '@/features/doctor/hooks/useDoctorLabQuery';
import { matchesLabTestPatient } from '@/features/doctor/utils/labPatientMatch';
import DoctorLabReportModal from './DoctorLabReportModal';
import DoctorPatientVisitsPanel from './DoctorPatientVisitsPanel';
import DoctorPatientVitalsPanel from './DoctorPatientVitalsPanel';
import DoctorPatientNotesPanel from './DoctorPatientNotesPanel';
import DoctorConsultHistorySnapshot from './DoctorConsultHistorySnapshot';
import { mergeVisitTimelineWithPrescriptions } from '@/features/doctor/utils/patientHistory';
import { mergeIpdIntoVisitHistory } from '@/features/doctor/utils/ipdVisitHistory';
import { useDoctorIpdPatientAdmissionsQuery } from '@/features/doctor/hooks/useDoctorIpdPatientAdmissionsQuery';
import { formatPatientAgeGender } from '@/features/doctor/utils/formatPatientAge';
import { patientsApi } from '@/shared/api/services';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { queryKeys } from '@/shared/api/queryKeys';
import { Button, Skeleton } from '@/shared/components/common';
import StatusPill from './StatusPill';
import { useAuth } from '@/shared/hooks/useAuth';
import { ACTIONS, canAccessAction } from '@/hooks/permissions';
import { useDoctorPermission, DOCTOR_PERMISSIONS } from '@/features/doctor/hooks/useDoctorPermission';
import { buildPatientLabOrderLinks } from '@/features/doctor/utils/patientLabOrderLinks';
import { DOCTOR_ENCOUNTER_MODE, matchesDoctorEncounterMode, prescriptionMatchesEncounterMode, labOrderMatchesEncounterMode } from '@/features/doctor/utils/encounterType';
import '../styles/doctor-ui.css';

function formatPrescriptionDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return dateStr;
}

export default function PatientHistoryProfile({
  patient,
  onBack,
  backLabel = 'Back to Patients',
  placeholderVisits,
  encounterMode = DOCTOR_ENCOUNTER_MODE.OPD,
}) {
  const token = useQueryToken();
  const { user } = useAuth();
  const canEditPrescription = canAccessAction(user, ACTIONS.UPDATE_PRESCRIPTION);
  const canCreateLabTest = useDoctorPermission(DOCTOR_PERMISSIONS.labCreate);
  const isOpdMode = encounterMode === DOCTOR_ENCOUNTER_MODE.OPD;
  const isIpdMode = encounterMode === DOCTOR_ENCOUNTER_MODE.IPD;
  const showAddLabTest = canCreateLabTest && isOpdMode;
  const showEditPrescription = canEditPrescription && isOpdMode;
  const patientUid = patient?.patientUid ?? patient?.id;
  const resolvedPatientId = patient?.patientId ?? null;

  const {
    data: historyData,
    isPending: historyPending,
  } = useDoctorPatientHistoryQuery(patientUid, {
    placeholderVisits,
    encounter_type: isIpdMode ? DOCTOR_ENCOUNTER_MODE.IPD : DOCTOR_ENCOUNTER_MODE.OPD,
  });

  const {
    data: ipdAdmissions = [],
    isPending: ipdAdmissionsPending,
  } = useDoctorIpdPatientAdmissionsQuery(patientUid, { enabled: isIpdMode });

  const [consultCacheTick, setConsultCacheTick] = useState(0);

  useEffect(() => {
    const onUpdate = () => setConsultCacheTick((tick) => tick + 1);
    window.addEventListener('hms:ipd-consult-cache-updated', onUpdate);
    return () => window.removeEventListener('hms:ipd-consult-cache-updated', onUpdate);
  }, []);

  const patientId = resolvedPatientId ?? historyData?.patientId ?? null;

  const { data: prescriptions = [] } = useDoctorPatientPrescriptionsQuery(patientId);

  const modePrescriptions = useMemo(
    () =>
      prescriptions.filter((rx) => prescriptionMatchesEncounterMode(rx, encounterMode)),
    [prescriptions, encounterMode],
  );

  const prescriptionsWithMedicines = useMemo(
    () =>
      modePrescriptions.filter((rx) =>
        (rx.medicines ?? []).some((med) => String(med?.name ?? '').trim()),
      ),
    [modePrescriptions],
  );

  const [prescriptionModal, setPrescriptionModal] = useState({ id: null, editing: false });
  const [viewLabTest, setViewLabTest] = useState(null);
  const [addLabOpen, setAddLabOpen] = useState(false);

  const canLoadLabs = Boolean(patientUid || resolvedPatientId);

  const { data: allLabTests = [] } = useDoctorLabTestsQuery(
    {},
    { enabled: canLoadLabs && !historyPending },
  );

  const { data: opdProfile } = useQuery({
    queryKey: queryKeys.patients.profile(patientId),
    queryFn: () => patientsApi.getPatientProfileById(patientId, token),
    enabled: patientId != null && !Number.isNaN(Number(patientId)) && !historyPending,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const profile = useMemo(() => {
    const opdPatient = opdProfile?.patient;
    return {
      ...patient,
      name: patient?.name || opdPatient?.name || '—',
      age: patient?.age ?? opdPatient?.age ?? null,
      dob: patient?.dob ?? opdPatient?.dob ?? null,
      gender: patient?.gender || opdPatient?.gender || '—',
      phone:
        (patient?.phone && patient.phone !== '—' ? patient.phone : null) ??
        historyData?.phone ??
        opdPatient?.phone ??
        '—',
      bloodGroup:
        (patient?.bloodGroup && patient.bloodGroup !== '—' ? patient.bloodGroup : null) ??
        opdPatient?.bloodGroup ??
        '—',
    };
  }, [patient, opdProfile?.patient, historyData?.phone]);

  const visits = useMemo(() => {
    const fromApi = (historyData?.visits ?? []).filter((visit) =>
      matchesDoctorEncounterMode(visit, encounterMode),
    );
    const withIpd = isIpdMode
      ? mergeIpdIntoVisitHistory(fromApi, ipdAdmissions, patientUid)
      : fromApi;
    const merged = mergeVisitTimelineWithPrescriptions(withIpd, modePrescriptions);
    return merged.filter((visit) => matchesDoctorEncounterMode(visit, encounterMode));
  }, [
    historyData?.visits,
    modePrescriptions,
    ipdAdmissions,
    patientUid,
    consultCacheTick,
    encounterMode,
    isIpdMode,
  ]);

  const clinicalByAppointmentId = useMemo(() => {
    const map = new Map();
    for (const visit of visits) {
      if (visit.appointmentDbId == null) continue;
      map.set(Number(visit.appointmentDbId), {
        symptoms: visit.symptoms,
        followUp: visit.followUp,
        notes: visit.notes,
      });
    }
    return map;
  }, [visits]);

  const clinicalByAdmissionId = useMemo(() => {
    const map = new Map();
    for (const visit of visits) {
      if (visit.admissionId == null) continue;
      const current = {
        symptoms: visit.symptoms,
        followUp: visit.followUp,
        notes: visit.notes,
      };
      const existing = map.get(Number(visit.admissionId));
      if (!existing || (visit.sortTime ?? 0) >= (existing.sortTime ?? 0)) {
        map.set(Number(visit.admissionId), { ...current, sortTime: visit.sortTime });
        map.set(String(visit.admissionId), { ...current, sortTime: visit.sortTime });
      }
    }
    return map;
  }, [visits]);

  const showVisitSkeleton =
    (historyPending || (isIpdMode && ipdAdmissionsPending)) && visits.length === 0;

  const patientLabs = useMemo(
    () =>
      allLabTests
        .filter((test) => {
          if (
            !matchesLabTestPatient(test, {
              patientUid,
              patientId,
              name: profile.name !== '—' ? profile.name : patient?.name,
            })
          ) {
            return false;
          }
          return labOrderMatchesEncounterMode(test, encounterMode);
        })
        .sort((a, b) => new Date(b.orderedAt || 0) - new Date(a.orderedAt || 0)),
    [allLabTests, patientUid, patientId, profile.name, patient?.name, encounterMode]
  );

  const labOrderLinks = useMemo(() => {
    if (!isOpdMode) return [];
    return buildPatientLabOrderLinks(visits, ipdAdmissions).filter(
      (link) => link.appointmentDbId != null,
    );
  }, [visits, ipdAdmissions, isOpdMode]);

  const viewingPrescription = modePrescriptions.find((rx) => rx.id === prescriptionModal.id);

  const openPrescriptionModal = (id, editing = false) => {
    setPrescriptionModal({ id, editing: editing && showEditPrescription });
  };

  const closePrescriptionModal = () => {
    setPrescriptionModal({ id: null, editing: false });
  };

  if (!patient) return null;

  return (
    <div className="doc-page doc-patient-profile">
      <button type="button" className="doc-labs-back" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden />
        {backLabel}
      </button>

      <div className="doc-card doc-profile-hero">
        <div className="doc-profile-hero__main">
          <div className="doc-profile-avatar" aria-hidden>
            <User size={22} />
          </div>
          <div className="doc-profile-hero__identity">
            <h2 className="doc-profile-name">{profile.name}</h2>
            <p className="doc-profile-meta">
              {patientUid} ·{' '}
              {formatPatientAgeGender({ age: profile.age, dob: profile.dob, gender: profile.gender })}
            </p>
          </div>
          <div className="doc-profile-hero__tags">
            <span className="doc-profile-tag">
              <Phone size={13} aria-hidden />
              {profile.phone || '—'}
            </span>
            <span className="doc-profile-tag">
              <Droplet size={13} aria-hidden />
              {profile.bloodGroup || '—'}
            </span>
          </div>
        </div>
      </div>

      <section className="doc-card doc-profile-panel doc-profile-panel--rx">
        <div className="doc-profile-panel__head">
          <h3 className="doc-profile-panel__title">
            <Pill size={16} aria-hidden />
            Prescriptions
            {prescriptionsWithMedicines.length > 0 ? (
              <span className="doc-profile-panel__count">{prescriptionsWithMedicines.length}</span>
            ) : null}
          </h3>
        </div>
        {prescriptionsWithMedicines.length === 0 ? (
          <p className="text-muted doc-profile-empty">No prescriptions for this patient.</p>
        ) : (
          <div className="table-wrap doc-profile-rx-table-wrap">
            <table className="data-table doc-profile-rx-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Diagnosis</th>
                  <th scope="col">Medicines</th>
                  <th scope="col" className="doc-profile-rx-table__th-actions">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {prescriptionsWithMedicines.map((rx) => (
                  <tr key={rx.id}>
                    <td className="doc-profile-rx-table__date">
                      {formatPrescriptionDate(rx.date)}
                    </td>
                    <td className="doc-profile-rx-table__diagnosis">{rx.diagnosis || '—'}</td>
                    <td className="doc-profile-rx-table__meds">
                      <div className="doc-profile-rx-med-chips">
                        {rx.medicines.map((med, index) =>
                          med.name ? (
                            <span key={`${rx.id}-${index}`} className="doc-profile-rx-med-chip">
                              {med.name}
                            </span>
                          ) : null
                        )}
                      </div>
                    </td>
                    <td className="doc-profile-rx-table__actions">
                      <div className="doc-profile-rx-table__action-group">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openPrescriptionModal(rx.id, false)}
                        >
                          <Eye size={14} aria-hidden />
                          View
                        </Button>
                        {showEditPrescription ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openPrescriptionModal(rx.id, true)}
                          >
                            <Edit3 size={14} aria-hidden />
                            Add medicine
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="doc-profile-grid">
        <section className="doc-card doc-profile-panel doc-profile-panel--consulting">
          <div className="doc-profile-panel__head">
            <h3 className="doc-profile-panel__title">
              <FileText size={16} aria-hidden />
              Consulting History
              {visits.length > 0 ? (
                <span className="doc-profile-panel__count">{visits.length}</span>
              ) : null}
            </h3>
          </div>
          <div className="doc-profile-panel__body">
            {showVisitSkeleton ? (
              <VisitHistorySkeleton />
            ) : visits.length === 0 ? (
              <p className="text-muted doc-profile-empty">No visit records yet.</p>
            ) : (
              <DoctorConsultHistorySnapshot visits={visits} />
            )}
          </div>
        </section>

        <section className="doc-card doc-profile-panel doc-profile-panel--labs">
          <div className="doc-profile-panel__head">
            <h3 className="doc-profile-panel__title">
              <Beaker size={16} aria-hidden />
              Lab Reports
              {patientLabs.length > 0 ? (
                <span className="doc-profile-panel__count">{patientLabs.length}</span>
              ) : null}
            </h3>
            {showAddLabTest ? (
              <div className="doc-profile-panel__head-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAddLabOpen(true)}
                >
                  <Plus size={14} aria-hidden />
                  Add lab test
                </Button>
              </div>
            ) : null}
          </div>
          {patientLabs.length === 0 ? (
            <p className="text-muted doc-profile-empty">No lab tests</p>
          ) : (
            <ul className="doc-profile-lab-list">
              {patientLabs.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className="doc-profile-lab-item doc-profile-lab-item--clickable"
                    onClick={() => setViewLabTest(t)}
                  >
                    <div>
                      <strong>{t.testName}</strong>
                      <span className="text-muted">{t.orderedDisplay}</span>
                    </div>
                    <StatusPill status={t.doctorStatus} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {!isOpdMode ? (
        <>
          <DoctorPatientVitalsPanel patientId={patientId} />
          <DoctorPatientNotesPanel patientId={patientId} />
          <DoctorPatientVisitsPanel
            patientId={patientId}
            patientUid={patientUid}
            admissions={ipdAdmissions}
          />
        </>
      ) : null}

      <PrescriptionDetailModal
        prescriptionId={prescriptionModal.id}
        open={prescriptionModal.id != null}
        initialEditing={prescriptionModal.editing}
        onClose={closePrescriptionModal}
        patientId={patientId}
        patientUid={patientUid}
        patientName={profile.name !== '—' ? profile.name : undefined}
        clinicalByAppointmentId={clinicalByAppointmentId}
        clinicalByAdmissionId={clinicalByAdmissionId}
        visitTimeline={visits}
        fallbackAdmissionId={viewingPrescription?.admissionId ?? null}
        readOnly={!isOpdMode}
        addMedicineOnly={isOpdMode}
      />

      <AddLabTestModal
        open={addLabOpen}
        onClose={() => setAddLabOpen(false)}
        patientUid={patientUid}
        patientName={profile.name !== '—' ? profile.name : undefined}
        linkOptions={labOrderLinks}
      />

      <DoctorLabReportModal
        test={viewLabTest}
        open={viewLabTest != null}
        onClose={() => setViewLabTest(null)}
      />
    </div>
  );
}

function VisitHistorySkeleton() {
  return (
    <div className="doc-consult-snapshot" aria-busy="true" aria-label="Loading consulting history">
      <Skeleton height={72} />
      <div style={{ marginTop: '0.75rem' }}>
        <Skeleton height={140} />
      </div>
    </div>
  );
}

