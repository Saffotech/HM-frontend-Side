import {
  useDoctorAppointmentDetailQuery,
  useUpdateDoctorAppointmentStatusMutation,
} from '@/features/doctor/hooks/useDoctorAppointmentQuery';
import { formatAppointmentTimeDisplay } from '@/features/doctor/utils/doctorDates';
import { getAppointmentStatusActions, getDoctorDisplayStatus } from '@/features/doctor/utils/appointmentWorkflow';
import { Modal, Button } from '@/shared/components/common';
import { useAuth } from '@/shared/hooks/useAuth';
import { ACTIONS, canAccessAction } from '@/hooks/permissions';
import { toast } from '@/shared/utils/toast';
import StatusPill from './StatusPill';
import '../styles/doctor-ui.css';

function AppointmentDetailView({ detail, doctorLabel }) {
  return (
    <div className="doc-rx-detail doc-appt-detail">
      <dl className="doc-rx-detail__meta">
        <div>
          <dt>Appointment ID</dt>
          <dd>#{detail.dbId ?? detail.id}</dd>
        </div>
        <div>
          <dt>Patient</dt>
          <dd>{detail.patientName || '—'}</dd>
        </div>
        <div>
          <dt>Doctor</dt>
          <dd>{detail.doctorName || doctorLabel || '—'}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{detail.status ? <StatusPill status={getDoctorDisplayStatus(detail.status)} /> : '—'}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{detail.date || '—'}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{detail.time ? formatAppointmentTimeDisplay(detail.time) : '—'}</dd>
        </div>
      </dl>
    </div>
  );
}

export default function AppointmentDetailModal({ appointmentDbId, open, onClose }) {
  const { user } = useAuth();
  const canUpdateStatus = canAccessAction(user, ACTIONS.CONSULT);
  const doctorLabel = user?.full_name || user?.name || null;

  const {
    data: detail,
    isLoading,
    isError,
    error,
  } = useDoctorAppointmentDetailQuery(appointmentDbId, {
    enabled: open && appointmentDbId != null,
  });

  const updateStatus = useUpdateDoctorAppointmentStatusMutation();
  const statusActions = detail ? getAppointmentStatusActions(detail.status) : [];

  const handleClose = () => {
    onClose();
  };

  const handleStatusChange = async (nextStatus) => {
    if (!detail?.dbId) {
      toast.error('Appointment id missing');
      return;
    }

    try {
      await updateStatus.mutateAsync({
        appointment: { dbId: detail.dbId, id: detail.id },
        data: { status: nextStatus },
      });
      toast.success('Appointment status updated');
    } catch {
      // Toast handled by mutation onError; keep modal open
    }
  };

  const title = detail?.patientName
    ? `Appointment · ${detail.patientName}`
    : `Appointment #${appointmentDbId ?? ''}`;

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={title}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          {canUpdateStatus &&
            statusActions.map((action) => (
              <Button
                key={action.status}
                variant={action.variant === 'danger' ? 'danger' : 'primary'}
                disabled={updateStatus.isPending || isLoading || isError}
                onClick={() => handleStatusChange(action.status)}
              >
                {updateStatus.isPending ? 'Updating…' : action.label}
              </Button>
            ))}
        </>
      }
    >
      {isLoading && <p className="text-muted">Loading appointment…</p>}
      {isError && (
        <p className="field__error">{error?.message || 'Unable to load appointment'}</p>
      )}
      {!isLoading && !isError && detail && (
        <AppointmentDetailView detail={detail} doctorLabel={doctorLabel} />
      )}
    </Modal>
  );
}
