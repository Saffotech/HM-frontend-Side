import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button, Modal } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';

export default function RegisterPatientSuccessModal({ isOpen, successData, onClose }) {
  const navigate = useNavigate();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      footer={(
        <>
          <Button variant="outline" onClick={() => navigate(ROUTES.APPOINTMENTS)}>Appointments</Button>
          <Button variant="outline" onClick={() => navigate(ROUTES.DASHBOARD)}>Dashboard</Button>
          <Button onClick={() => navigate(`/billing/${successData?.bill.id}`)}>View Bill</Button>
        </>
      )}
    >
      <div className="success-dialog">
        <CheckCircle2 size={48} className="text-green" />
        <h3>Patient Registered</h3>
        {successData && (
          <>
            <p>
              ID: {successData.patient.id} — Bill: {successData.bill.id}
            </p>
            {successData.appointment?.time && (
              <p className="register-appointment__success-slot">
                Appointment: {successData.appointment.displayDate} at {successData.appointment.time}
              </p>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
