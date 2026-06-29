import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Plus } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NursePageHeader from '@/features/nurse/components/NursePageHeader';
import { useNursePermissionSet } from '@/features/nurse/hooks/useNursePermission';
import { QueryFeedback } from '@/shared/components/common';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
import {
  useNurseNotesSearchQuery,
  useNursePatientQueueAppointmentId,
  useNurseQueueQuery,
} from '@/shared/hooks/queries/useNurseQuery';
import { toast } from '@/shared/utils/toast';

export default function NursePatientNotesTimelinePage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { canCreateNotes } = useNursePermissionSet();
  const { data, isLoading, isError, error, refetch } = useNurseNotesSearchQuery({ patient_id: patientId });
  const { data: queueData } = useNurseQueueQuery({ page: 1, page_size: 100 });
  const {
    appointmentId,
    isLoading: isAppointmentLoading,
  } = useNursePatientQueueAppointmentId(patientId);

  const patientDisplayId = useMemo(() => {
    const fromNote = formatPatientIdDisplay(data?.items?.[0]);
    if (fromNote !== '—') return fromNote;
    const queuePatient = queueData?.items?.find((q) => String(q.patient_id) === String(patientId));
    const fromQueue = formatPatientIdDisplay(queuePatient);
    return fromQueue !== '—' ? fromQueue : 'Patient';
  }, [data?.items, queueData?.items, patientId]);

  const handleCreateNote = () => {
    if (!appointmentId) {
      toast.error('This patient is not in today\'s queue. Add notes from the queue or dashboard.');
      return;
    }
    navigate(`/nurse/notes/new?appointmentId=${appointmentId}&patientId=${patientId}`);
  };

  const createDisabled = isAppointmentLoading || !appointmentId;

  return (
    <NurseLayout>
      <div className="nurse-page nurse-max-w-wide">
        <NursePageHeader
          title={`Notes Timeline — ${patientDisplayId}`}
          actions={
            canCreateNotes ? (
              <button
                type="button"
                className="nurse-btn nurse-btn--primary"
                onClick={handleCreateNote}
                disabled={createDisabled}
                title={createDisabled && !isAppointmentLoading ? 'Patient must be in today\'s queue' : undefined}
              >
                <Plus size={16} /> Add Note
              </button>
            ) : null
          }
        />
        <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
          {!data?.items?.length ? (
            <div className="nurse-card nurse-card--padded" style={{ textAlign: 'center', color: '#64748b' }}>
              No notes for this patient.
            </div>
          ) : (
            <div className="nurse-timeline">
              {data.items.map((note) => (
                <div key={note.id} className="nurse-timeline__item">
                  <span className="nurse-timeline__dot"><FileText size={12} /></span>
                  <button
                    type="button"
                    className="nurse-card nurse-card--padded"
                    style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
                    onClick={() => navigate(`/nurse/notes/${note.id}`)}
                  >
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                      {new Date(note.created_at).toLocaleString()}
                    </div>
                    <p style={{ fontSize: '0.875rem' }}>{note.symptoms || note.additional_notes || 'Empty note'}</p>
                  </button>
                </div>
              ))}
            </div>
          )}
        </QueryFeedback>
      </div>
    </NurseLayout>
  );
}
