import { useMemo } from 'react';
import { Activity } from 'lucide-react';
import NurseVitalsSnapshotView from '@/features/nurse/components/NurseVitalsSnapshotView';
import { useDoctorPatientVitalsQuery } from '@/features/doctor/hooks/useDoctorPatientQuery';
import { useDoctorPermission, DOCTOR_PERMISSIONS } from '@/features/doctor/hooks/useDoctorPermission';
import { withAssembledDoctorVitalHistory } from '@/shared/api/mappers/doctorPatientMapper';
import '../styles/doctor-patient-clinical.css';

const VITALS_FILTERS = { page: 1, page_size: 100 };

function isAssignmentForbidden(error) {
  if (!error || Number(error.status) !== 403) return false;
  const msg = String(error.message || error.detail || '').toLowerCase();
  return msg.includes('not assigned');
}

/** Read-only nurse vitals — GET /doctor/patients/{id}/vitals */
export default function DoctorPatientVitalsPanel({ patientId, className = '' }) {
  const canView = useDoctorPermission(DOCTOR_PERMISSIONS.vitalsView);

  const { data, isPending, isError, error } = useDoctorPatientVitalsQuery(
    patientId,
    VITALS_FILTERS,
    { enabled: canView },
  );

  const items = useMemo(() => {
    const list = data?.items ?? [];
    return [...list].sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
  }, [data?.items]);

  const vitalForSnapshot = useMemo(
    () => withAssembledDoctorVitalHistory(items[0] || null, items),
    [items],
  );

  const historyCount = Math.max(vitalForSnapshot?.history?.length ?? 0, items.length);

  if (!canView) return null;

  const panelClass = ['doc-card', 'doc-profile-panel', 'doc-profile-panel--vitals', className]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={panelClass}>
      <div className="doc-profile-panel__head">
        <h3 className="doc-profile-panel__title">
          <Activity size={16} aria-hidden />
          Vitals
          {historyCount > 0 ? (
            <span className="doc-profile-panel__count">{historyCount}</span>
          ) : null}
        </h3>
      </div>

      <div className="doc-profile-panel__body">
        {isPending ? (
          <p className="text-muted doc-profile-empty">Loading vitals...</p>
        ) : isError ? (
          <p className="text-muted doc-profile-empty">
            {isAssignmentForbidden(error)
              ? 'This patient is not assigned to you.'
              : 'Could not load vitals.'}
          </p>
        ) : items.length === 0 ? (
          <p className="text-muted doc-profile-empty">No vitals recorded for this patient.</p>
        ) : (
          <NurseVitalsSnapshotView vital={vitalForSnapshot} />
        )}
      </div>
    </section>
  );
}
