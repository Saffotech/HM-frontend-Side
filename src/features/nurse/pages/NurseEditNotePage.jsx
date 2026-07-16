import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NurseNoteFormFields, { noteToForm } from '@/features/nurse/components/NurseNoteFormFields';
import { useNursePermission } from '@/features/nurse/hooks/useNursePermission';
import { QueryFeedback } from '@/shared/components/common';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
import { useNurseNoteQuery, useUpdateNoteMutation } from '@/shared/hooks/queries/useNurseQuery';
import { toast } from '@/shared/utils/toast';

export default function NurseEditNotePage() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const canUpdateNotes = useNursePermission('nurse_notes:update');
  const { data: note, isLoading, isError, error, refetch } = useNurseNoteQuery(noteId);
  const updateMut = useUpdateNoteMutation(noteId);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (note) {
      setForm(noteToForm(note));
    }
  }, [note]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = (e) => {
    e.preventDefault();
    updateMut.mutate(form, {
      onSuccess: () => {
        toast.success('Note updated');
        navigate(`/nurse/notes/${noteId}`);
      },
      onError: () => toast.error('Failed to update note'),
    });
  };

  const createdAt = note?.created_at ? new Date(note.created_at).toLocaleString() : '—';

  return (
    <NurseLayout>
      <div className="nurse-page nurse-max-w-wide">
        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
          {!note ? (
            <div className="nurse-alert nurse-alert--error">Note not found.</div>
          ) : !canUpdateNotes ? (
            <div className="nurse-alert nurse-alert--error">You do not have permission to update notes.</div>
          ) : !form ? (
            <div className="nurse-card nurse-card--padded nurse-vital-detail__loading">Preparing form…</div>
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
                </div>
              </div>

              <div className="nurse-vital-detail__info-bar nurse-card nurse-card--padded">
                <div className="nurse-vital-detail__info-item">
                  <Calendar size={18} aria-hidden />
                  <div>
                    <span className="nurse-vital-detail__info-label">Last Updated</span>
                    <span className="nurse-vital-detail__info-value">{createdAt}</span>
                  </div>
                </div>
                <div className="nurse-vital-detail__info-item">
                  <User size={18} aria-hidden />
                  <div>
                    <span className="nurse-vital-detail__info-label">Recorded By</span>
                    <span className="nurse-vital-detail__info-value">
                      {note.created_by || note.nurse_name || note.created_by_name || '—'}
                    </span>
                  </div>
                </div>
              </div>

              <section className="nurse-vital-detail__section">
                <h2 className="nurse-vital-detail__section-title">Update Nursing Note</h2>
                <form className="nurse-note-edit__form nurse-card nurse-card--padded" onSubmit={onSubmit}>
                  <NurseNoteFormFields form={form} onChange={set} idPrefix="note" />
                  <div className="nurse-form-actions">
                    <button type="button" className="nurse-btn nurse-btn--secondary" onClick={() => navigate(-1)}>
                      Cancel
                    </button>
                    <button type="submit" className="nurse-btn nurse-btn--primary" disabled={updateMut.isPending}>
                      {updateMut.isPending ? 'Updating…' : 'Update Note'}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}
        </QueryFeedback>
      </div>
    </NurseLayout>
  );
}
