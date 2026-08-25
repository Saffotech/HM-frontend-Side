import { useMemo } from 'react';
import { ClipboardList } from 'lucide-react';
import NurseNotesSnapshotView from '@/features/nurse/components/NurseNotesSnapshotView';
import { useDoctorPatientNotesQuery } from '@/features/doctor/hooks/useDoctorPatientQuery';
import { useDoctorPermission, DOCTOR_PERMISSIONS } from '@/features/doctor/hooks/useDoctorPermission';
import { withAssembledDoctorNoteHistory } from '@/shared/api/mappers/doctorPatientMapper';
import '../styles/doctor-patient-clinical.css';

const NOTES_FILTERS = { page: 1, page_size: 100 };

function isAssignmentForbidden(error) {
  if (!error || Number(error.status) !== 403) return false;
  const msg = String(error.message || error.detail || '').toLowerCase();
  return msg.includes('not assigned');
}

/** Read-only nursing notes — GET /doctor/patients/{id}/notes */
export default function DoctorPatientNotesPanel({ patientId, className = '' }) {
  const canView = useDoctorPermission(DOCTOR_PERMISSIONS.notesView);

  const { data, isPending, isError, error } = useDoctorPatientNotesQuery(
    patientId,
    NOTES_FILTERS,
    { enabled: canView },
  );

  const items = useMemo(() => {
    const list = data?.items ?? [];
    return [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [data?.items]);

  const noteForSnapshot = useMemo(
    () => withAssembledDoctorNoteHistory(items[0] || null, items),
    [items],
  );

  const historyCount = Math.max(noteForSnapshot?.history?.length ?? 0, items.length);

  if (!canView) return null;

  const panelClass = [
    'doc-card',
    'doc-profile-panel',
    'doc-profile-panel--nursing-notes',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={panelClass}>
      <div className="doc-profile-panel__head">
        <h3 className="doc-profile-panel__title">
          <ClipboardList size={16} aria-hidden />
          Nursing Notes
          {historyCount > 0 ? (
            <span className="doc-profile-panel__count">{historyCount}</span>
          ) : null}
        </h3>
      </div>

      <div className="doc-profile-panel__body">
        {isPending ? (
          <p className="text-muted doc-profile-empty">Loading nursing notes...</p>
        ) : isError ? (
          <p className="text-muted doc-profile-empty">
            {isAssignmentForbidden(error)
              ? 'This patient is not assigned to you.'
              : 'Could not load nursing notes.'}
          </p>
        ) : items.length === 0 ? (
          <p className="text-muted doc-profile-empty">No nursing notes recorded for this patient.</p>
        ) : (
          <NurseNotesSnapshotView note={noteForSnapshot} />
        )}
      </div>
    </section>
  );
}
