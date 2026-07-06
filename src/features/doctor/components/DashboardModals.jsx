import { memo } from 'react';
import ConsultationModal from './ConsultationModal';
import QuickPrescribeModal from './QuickPrescribeModal';
import QuickNotesModal from './QuickNotesModal';

function DashboardModals({
  consultFor,
  onCloseConsult,
  rxFor,
  rxAppointment,
  onClosePrescribe,
  notesFor,
  onCloseNotes,
}) {
  return (
    <>
      <ConsultationModal
        appointment={consultFor}
        open={!!consultFor}
        onClose={onCloseConsult}
        onDone={onCloseConsult}
      />

      <QuickPrescribeModal
        patient={rxFor}
        appointment={rxAppointment}
        open={!!rxFor && !!rxAppointment}
        onClose={onClosePrescribe}
      />
      <QuickNotesModal appointment={notesFor} open={!!notesFor} onClose={onCloseNotes} />
    </>
  );
}

export default memo(DashboardModals);
