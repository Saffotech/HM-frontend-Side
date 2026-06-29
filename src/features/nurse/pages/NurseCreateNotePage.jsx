import { useState } from 'react';

import { useSearchParams, useNavigate, Link } from 'react-router-dom';

import { ArrowLeft, Calendar, FileText, User } from 'lucide-react';

import NurseLayout from '@/features/nurse/components/NurseLayout';
import { useNursePermission } from '@/features/nurse/hooks/useNursePermission';
import { QueryFeedback } from '@/shared/components/common';

import NurseNoteFormFields, { INITIAL_NOTE_FORM } from '@/features/nurse/components/NurseNoteFormFields';
import {
  useCreateNoteMutation,
  useNursePatientQueueAppointmentId,
  useNurseQueueQuery,
} from '@/shared/hooks/queries/useNurseQuery';

import { toast } from '@/shared/utils/toast';

import { ROUTES } from '@/shared/constants';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';



export default function NurseCreateNotePage() {

  const [searchParams] = useSearchParams();

  const appointmentIdFromUrl = searchParams.get('appointmentId');
  const patientIdFromUrl = searchParams.get('patientId');

  const navigate = useNavigate();

  const createMut = useCreateNoteMutation();
  const canCreateNotes = useNursePermission('nurse_notes:create');

  const [form, setForm] = useState(INITIAL_NOTE_FORM);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));



  const {
    appointmentId: resolvedAppointmentId,
    isLoading: isResolvingAppointment,
    isError: isResolveError,
    error: resolveError,
    refetch: refetchAppointment,
  } = useNursePatientQueueAppointmentId(patientIdFromUrl, {
    enabled: !appointmentIdFromUrl && Boolean(patientIdFromUrl),
  });

  const appointmentId = appointmentIdFromUrl || resolvedAppointmentId;
  const { data: queueData } = useNurseQueueQuery(
    { page: 1, page_size: 100 },
    { enabled: Boolean(appointmentIdFromUrl || patientIdFromUrl) }
  );

  if (!appointmentIdFromUrl && patientIdFromUrl && isResolvingAppointment) {
    return (
      <NurseLayout>
        <div className="nurse-page nurse-max-w-wide">
          <QueryFeedback isLoading />
        </div>
      </NurseLayout>
    );
  }

  if (!appointmentIdFromUrl && patientIdFromUrl && isResolveError) {
    return (
      <NurseLayout>
        <div className="nurse-page nurse-max-w-wide">
          <QueryFeedback
            isLoading={false}
            isError
            error={resolveError}
            onRetry={refetchAppointment}
          />
        </div>
      </NurseLayout>
    );
  }

  if (!appointmentId) {

    return (

      <NurseLayout>

        <div className="nurse-page nurse-max-w-wide">

          <div className="nurse-alert nurse-alert--error">

            <p>
              {patientIdFromUrl
                ? 'This patient is not in today\'s queue. Open them from the queue or dashboard to add notes.'
                : 'Appointment ID is required.'}
            </p>

            <Link to={ROUTES.NURSE_QUEUE}>Return to Queue</Link>

          </div>

        </div>

      </NurseLayout>

    );

  }

  if (!canCreateNotes) {
    return (
      <NurseLayout>
        <div className="nurse-page nurse-max-w-wide">
          <div className="nurse-alert nurse-alert--error">
            <p>You do not have permission to create nursing notes.</p>
            <Link to={ROUTES.NURSE_QUEUE}>Return to Queue</Link>
          </div>
        </div>
      </NurseLayout>
    );
  }



  const onSubmit = (e) => {

    e.preventDefault();

    createMut.mutate(

      { appointment_id: appointmentId, ...form },

      {

        onSuccess: () => {

          toast.success('Nursing note saved');

          navigate(ROUTES.NURSE_QUEUE);

        },

        onError: () => toast.error('Failed to save note'),

      }

    );

  };



  const createdAt = new Date().toLocaleString();
  const queueAppointment = queueData?.items?.find((item) => {
    if (appointmentIdFromUrl) {
      return String(item.appointment_id ?? item.id) === String(appointmentIdFromUrl);
    }
    return String(item.patient_id) === String(patientIdFromUrl);
  });
  const patientMeta = queueAppointment
    ? {
        patient_name: queueAppointment.patient_name || 'Unknown Patient',
        patientUid: queueAppointment.patientUid || '',
        bed_number: queueAppointment.bed_number || '—',
      }
    : null;

  return (
    <NurseLayout>
      <div className="nurse-page nurse-max-w-wide">
      <div className="nurse-note-detail">

        <div className="nurse-vital-detail__top">

          <div className="nurse-vital-detail__identity">

            <div className="nurse-note-detail__avatar" aria-hidden>

              <User size={28} />

            </div>

            <div>

              <h1 className="nurse-vital-detail__name">{patientMeta?.patient_name || 'Unknown Patient'}</h1>

              <p className="nurse-vital-detail__meta-line">

                <span>Patient ID: <strong>{formatPatientIdDisplay(patientMeta)}</strong></span>

                <span className="nurse-vital-detail__dot" aria-hidden>·</span>

                <span>Bed: <strong>{patientMeta?.bed_number || '—'}</strong></span>

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

              <span className="nurse-vital-detail__info-label">Creating At</span>

              <span className="nurse-vital-detail__info-value">{createdAt}</span>

            </div>

          </div>

          <div className="nurse-vital-detail__info-item">

            <FileText size={18} aria-hidden />

            <div>

              <span className="nurse-vital-detail__info-label">Appointment</span>

              <span className="nurse-vital-detail__info-value">{appointmentId}</span>

            </div>

          </div>

        </div>



        <section className="nurse-vital-detail__section">

          <h2 className="nurse-vital-detail__section-title">Create Nursing Note</h2>



          <form className="nurse-note-edit__form nurse-card nurse-card--padded" onSubmit={onSubmit}>

            <NurseNoteFormFields form={form} onChange={set} idPrefix="create-note" />



            <div className="nurse-form-actions">

              <button type="button" className="nurse-btn nurse-btn--secondary" onClick={() => navigate(-1)}>

                Cancel

              </button>

              <button type="submit" className="nurse-btn nurse-btn--primary" disabled={createMut.isPending}>

                {createMut.isPending ? 'Saving…' : 'Save Note'}

              </button>

            </div>

          </form>

        </section>

      </div>
      </div>
    </NurseLayout>
  );
}


