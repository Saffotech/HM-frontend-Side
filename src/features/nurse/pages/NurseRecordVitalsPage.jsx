import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NursePageHeader from '@/features/nurse/components/NursePageHeader';
import NurseVitalsFormFields, { INITIAL_VITALS_FORM, buildVitalsPayload } from '@/features/nurse/components/NurseVitalsFormFields';
import { useNursePermission } from '@/features/nurse/hooks/useNursePermission';
import { QueryFeedback } from '@/shared/components/common';
import { useCreateVitalsMutation, useNursePatientQueueAppointmentId } from '@/shared/hooks/queries/useNurseQuery';
import { toast } from '@/shared/utils/toast';
import { ROUTES } from '@/shared/constants';

export default function NurseRecordVitalsPage() {
  const [searchParams] = useSearchParams();
  const appointmentIdFromUrl = searchParams.get('appointmentId');
  const patientIdFromUrl = searchParams.get('patientId');
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_VITALS_FORM);
  const createMut = useCreateVitalsMutation();
  const canCreateVitals = useNursePermission('nurse_vitals:create');

  const {
    appointmentId: resolvedAppointmentId,
    isLoading: isResolvingAppointment,
  } = useNursePatientQueueAppointmentId(patientIdFromUrl, {
    enabled: !appointmentIdFromUrl && Boolean(patientIdFromUrl),
  });

  const appointmentId = appointmentIdFromUrl || resolvedAppointmentId;
  const patientId = patientIdFromUrl ? Number(patientIdFromUrl) : null;
  const canSubmit = Boolean(appointmentId) || (Number.isSafeInteger(patientId) && patientId >= 1);

  if (!appointmentIdFromUrl && patientIdFromUrl && isResolvingAppointment) {
    return (
      <NurseLayout>
        <div className="nurse-page nurse-max-w-form">
          <QueryFeedback isLoading />
        </div>
      </NurseLayout>
    );
  }

  if (!canSubmit) {
    return (
      <NurseLayout>
        <div className="nurse-alert nurse-alert--error">
          <p>Select a patient from the Dashboard to record vitals.</p>
          <Link to={ROUTES.NURSE_DASHBOARD}>Return to Dashboard</Link>
        </div>
      </NurseLayout>
    );
  }

  if (!canCreateVitals) {
    return (
      <NurseLayout>
        <div className="nurse-page nurse-max-w-form">
          <div className="nurse-alert nurse-alert--error">
            <p>You do not have permission to record vitals.</p>
            <Link to={ROUTES.NURSE_DASHBOARD}>Return to Dashboard</Link>
          </div>
        </div>
      </NurseLayout>
    );
  }

  const onSubmit = (e) => {
    e.preventDefault();
    const payload = buildVitalsPayload(form, {
      appointmentId: appointmentId || undefined,
      patientId: patientId || undefined,
    });
    createMut.mutate(payload, {
      onSuccess: () => {
        toast.success('Vitals recorded successfully');
        navigate(ROUTES.NURSE_DASHBOARD);
      },
      onError: (err) => {
        toast.error(err?.message || 'Failed to save vitals');
      },
    });
  };

  return (
    <NurseLayout>
      <div className="nurse-page nurse-max-w-form">
        <NursePageHeader title="Record Patient Vitals" />
        <form className="nurse-card nurse-card--padded nurse-form" onSubmit={onSubmit}>
          <NurseVitalsFormFields form={form} setForm={setForm} />
          <div className="nurse-form-actions">
            <button type="button" className="nurse-btn nurse-btn--secondary" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="nurse-btn nurse-btn--primary" disabled={createMut.isPending}>
              {createMut.isPending ? 'Saving…' : 'Save Vitals'}
            </button>
          </div>
        </form>
      </div>
    </NurseLayout>
  );
}
