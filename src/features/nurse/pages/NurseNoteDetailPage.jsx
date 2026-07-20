import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, User } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseNotesSnapshotView from '@/features/nurse/components/NurseNotesSnapshotView';
import { useNursePermission } from '@/features/nurse/hooks/useNursePermission';
import { QueryFeedback } from '@/shared/components/common';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
import { useNurseNoteQuery } from '@/shared/hooks/queries/useNurseQuery';

export default function NurseNoteDetailPage() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const canUpdateNotes = useNursePermission('nurse_notes:update');
  const { data: note, isLoading, isError, error, refetch } = useNurseNoteQuery(noteId);

  return (
    <NurseLayout>
      <div className="nurse-page nurse-max-w-wide">
        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
          {!note ? (
            <div className="nurse-alert nurse-alert--error">Note not found.</div>
          ) : (
            <div className="nurse-note-detail">
              <div className="nurse-vital-detail__top">
                <div className="nurse-vital-detail__identity">
                  <div className="nurse-note-detail__avatar" aria-hidden>
                    <User size={28} />
                  </div>
                  <div>
                    <h1 className="nurse-vital-detail__name">{note.patient_name || 'Unknown Patient'}</h1>
                    <p className="nurse-vital-detail__meta-line">
                      <span>Patient ID: <strong>{formatPatientIdDisplay(note)}</strong></span>
                      <span className="nurse-vital-detail__dot" aria-hidden>·</span>
                      <span>Bed: <strong>{note.bed_number || '—'}</strong></span>
                    </p>
                  </div>
                </div>
                <div className="nurse-vital-detail__actions">
                  <button type="button" className="nurse-btn nurse-btn--secondary" onClick={() => navigate(-1)}>
                    <ArrowLeft size={16} />
                    Back
                  </button>
                  {canUpdateNotes && (
                    <button
                      type="button"
                      className="nurse-btn nurse-btn--primary"
                      onClick={() => {
                        const latestId = note.history?.[0]?.history_id ?? note.id;
                        navigate(`/nurse/notes/${latestId}/edit`);
                      }}
                    >
                      <Pencil size={16} />
                      Update
                    </button>
                  )}
                </div>
              </div>
              <NurseNotesSnapshotView note={note} />
            </div>
          )}
        </QueryFeedback>
      </div>
    </NurseLayout>
  );
}
