import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Beaker,
  ChevronDown,
  Droplet,
  FileText,
  Link2,
  Phone,
  Pill,
  Eye,
  Trash2,
  User,
} from 'lucide-react';
import {
  useDoctorPatientHistoryQuery,
  useDoctorPatientPrescriptionsQuery,
} from '@/features/doctor/hooks/useDoctorPatientQuery';
import { useDeletePrescriptionMutation } from '@/features/doctor/hooks/useDoctorPrescriptionQuery';
import PrescriptionDetailModal from './PrescriptionDetailModal';
import { useDoctorLabTestsQuery } from '@/features/doctor/hooks/useDoctorLabQuery';
import { mergeVisitTimelineWithPrescriptions } from '@/features/doctor/utils/patientHistory';
import { patientsApi } from '@/shared/api/services';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { queryKeys } from '@/shared/api/queryKeys';
import { Button, ConfirmDialog, Skeleton } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import StatusPill from './StatusPill';
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
}) {
  const token = useQueryToken();
  const patientUid = patient?.patientUid ?? patient?.id;
  const resolvedPatientId = patient?.patientId ?? null;

  const {
    data: historyData,
    isPending: historyPending,
    isFetching: historyFetching,
  } = useDoctorPatientHistoryQuery(patientUid, { placeholderVisits });

  const patientId = resolvedPatientId ?? historyData?.patientId ?? null;

  const { data: prescriptions = [] } = useDoctorPatientPrescriptionsQuery(patientId);

  const deletePrescription = useDeletePrescriptionMutation();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewPrescriptionId, setViewPrescriptionId] = useState(null);

  const { data: allLabTests = [] } = useDoctorLabTestsQuery(
    {},
    { enabled: Boolean(patientUid) && !historyPending },
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
    const fromApi = historyData?.visits ?? [];
    return mergeVisitTimelineWithPrescriptions(fromApi, prescriptions);
  }, [historyData?.visits, prescriptions]);

  const showVisitSkeleton = historyPending && visits.length === 0;

  const patientLabs = useMemo(
    () =>
      allLabTests.filter(
        (t) =>
          t.patientId === patientUid ||
          (patientId != null && t.patientId === String(patientId))
      ),
    [allLabTests, patientUid, patientId]
  );

  if (!patient) return null;

  const handleConfirmDelete = () => {
    if (!deleteTarget?.id) return;
    deletePrescription.mutate(
      { id: deleteTarget.id, patientId, patientUid },
      {
        onSuccess: () => {
          toast.success('Prescription deleted successfully');
          setDeleteTarget(null);
        },
      }
    );
  };

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
              {patientUid} · {profile.age != null ? `${profile.age} yrs` : '—'} ·{' '}
              {profile.gender || '—'}
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
          </h3>
          {prescriptions.length > 0 ? (
            <span className="doc-profile-panel__count">{prescriptions.length}</span>
          ) : null}
        </div>
        {prescriptions.length === 0 ? (
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
                {prescriptions.map((rx) => (
                  <tr key={rx.id}>
                    <td className="doc-profile-rx-table__date">
                      {formatPrescriptionDate(rx.date)}
                    </td>
                    <td className="doc-profile-rx-table__diagnosis">{rx.diagnosis || '—'}</td>
                    <td className="doc-profile-rx-table__meds">
                      {(rx.medicines ?? []).length > 0 ? (
                        <div className="doc-profile-rx-med-chips">
                          {rx.medicines.map((med, index) =>
                            med.name ? (
                              <span key={`${rx.id}-${index}`} className="doc-profile-rx-med-chip">
                                {med.name}
                              </span>
                            ) : null
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="doc-profile-rx-table__actions">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setViewPrescriptionId(rx.id)}
                      >
                        <Eye size={14} aria-hidden />
                        View
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        disabled={deletePrescription.isPending && deleteTarget?.id === rx.id}
                        onClick={() => setDeleteTarget(rx)}
                      >
                        <Trash2 size={14} aria-hidden />
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="doc-profile-grid">
        <section className="doc-card doc-profile-panel">
          <div className="doc-profile-panel__head">
            <h3 className="doc-profile-panel__title">
              <FileText size={16} aria-hidden />
              Visit History
            </h3>
            {visits.length > 0 ? (
              <span className="doc-profile-panel__hint">
                Newest first{historyFetching ? ' · updating…' : ''}
              </span>
            ) : null}
          </div>
          {showVisitSkeleton ? (
            <VisitHistorySkeleton />
          ) : visits.length === 0 ? (
            <p className="text-muted doc-profile-empty">No visit records yet.</p>
          ) : (
            <div className="doc-visit-list">
              {visits.map((visit, index) => (
                <VisitHistoryItem key={visit.id} visit={visit} isLatest={index === 0} />
              ))}
            </div>
          )}
        </section>

        <aside className="doc-card doc-profile-panel doc-profile-panel--side">
          <div className="doc-profile-panel__head">
            <h3 className="doc-profile-panel__title">
              <Beaker size={16} aria-hidden />
              Lab Reports
            </h3>
            {patientLabs.length > 0 ? (
              <span className="doc-profile-panel__count">{patientLabs.length}</span>
            ) : null}
          </div>
          {patientLabs.length === 0 ? (
            <p className="text-muted doc-profile-empty">No lab tests</p>
          ) : (
            <ul className="doc-profile-lab-list">
              {patientLabs.map((t) => (
                <li key={t.id} className="doc-profile-lab-item">
                  <div>
                    <strong>{t.testName}</strong>
                    <span className="text-muted">{t.orderedDisplay}</span>
                  </div>
                  <StatusPill status={t.doctorStatus} />
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Prescription?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      <PrescriptionDetailModal
        prescriptionId={viewPrescriptionId}
        open={viewPrescriptionId != null}
        onClose={() => setViewPrescriptionId(null)}
        patientId={patientId}
        patientUid={patientUid}
        patientName={profile.name !== '—' ? profile.name : undefined}
      />
    </div>
  );
}

function VisitHistorySkeleton({ count = 3 }) {
  return (
    <div className="doc-visit-list" aria-busy="true" aria-label="Loading visit history">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="doc-visit-card doc-visit-card--skeleton">
          <Skeleton height={44} />
        </div>
      ))}
    </div>
  );
}

function VisitHistoryItem({ visit, isLatest }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      className={`doc-visit-card${isLatest ? ' doc-visit-card--latest' : ''}${
        expanded ? ' doc-visit-card--expanded' : ''
      }`}
    >
      <button
        type="button"
        className="doc-visit-card__toggle"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} visit on ${visit.dateTime}`}
      >
        <ChevronDown
          size={16}
          aria-hidden
          className={`doc-visit-card__chevron${expanded ? ' doc-visit-card__chevron--open' : ''}`}
        />
        <time className="doc-visit-card__time">{visit.dateTime}</time>
        <span className="doc-visit-card__badges">
          {isLatest && <span className="doc-visit-latest">Latest</span>}
          {visit.status && <StatusPill status={visit.status} />}
        </span>
      </button>

      {expanded && (
        <div className="doc-visit-card__body">
          <div className="doc-visit-detail-grid">
            <div className="doc-visit-detail-tile">
              <span className="doc-visit-detail-tile__label">Symptoms</span>
              <p className="doc-visit-detail-tile__value">{visit.symptoms || '—'}</p>
            </div>
            <div className="doc-visit-detail-tile">
              <span className="doc-visit-detail-tile__label">Diagnosis</span>
              <p className="doc-visit-detail-tile__value">{visit.diagnosis || '—'}</p>
            </div>
            <div className="doc-visit-detail-tile">
              <span className="doc-visit-detail-tile__label">Notes</span>
              <p className="doc-visit-detail-tile__value">{visit.notes || '—'}</p>
            </div>
            <div className="doc-visit-detail-tile">
              <span className="doc-visit-detail-tile__label">Follow-up</span>
              <p className="doc-visit-detail-tile__value">{visit.followUp || '—'}</p>
            </div>
          </div>

          {visit.medicines.length > 0 && (
            <div className="doc-visit-rx-block">
              <div className="doc-visit-rx-block__head">
                <Link2 size={14} aria-hidden />
                <span>Prescription</span>
              </div>
              <ul className="doc-visit-rx-list">
                {visit.medicines.map((m, i) => (
                  <li key={i} className="doc-visit-rx-item">
                    <span className="doc-visit-rx-item__name">{m.name}</span>
                    {m.dosage && <span className="doc-visit-rx-item__dose">{m.dosage}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
