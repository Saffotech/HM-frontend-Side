import { useEffect } from 'react';
import { useAuthStore } from '@/shared/store/useAuthStore';
import { uid, todayOpdDate } from '@/features/doctor/utils/doctorDates';
import { useUpdateRecordsMutation } from '@/features/doctor/hooks/useDoctorQuery';
import { Modal, Button, Textarea } from '@/shared/components/common';
import { useFormValidation } from '@/shared/hooks/useFormValidation';
import { trimForm } from '@/shared/utils/trimForm';
import { toast } from '@/shared/utils/toast';

function validateQuickNote(values) {
  const errors = {};
  if (!values.note?.trim()) errors.note = 'Note is required';
  return errors;
}

export default function QuickNotesModal({ appointment, open, onClose }) {
  const { user } = useAuthStore();
  const doctorName = user?.full_name || 'Doctor';
  const updateRecords = useUpdateRecordsMutation();
  const { values, errors, handleChange, handleSubmit, setValues } = useFormValidation(
    { note: '' },
    validateQuickNote
  );

  useEffect(() => {
    if (open) setValues({ note: '' });
  }, [open, setValues]);

  if (!appointment) return null;

  const submit = handleSubmit((raw) => {
    const trimmed = trimForm(raw);
    updateRecords.mutate((prev) => [
      {
        id: 'MR' + uid(),
        patientId: appointment.patientId,
        diagnosis: 'Clinical note',
        treatmentPlan: trimmed.note,
        notes: trimmed.note,
        date: todayOpdDate(),
        doctor: doctorName,
      },
      ...prev,
    ]);
    toast.success('Note added');
    onClose();
  });

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={`Notes · ${appointment.patientName}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={updateRecords.isPending} onClick={submit}>
            {updateRecords.isPending ? 'Saving...' : 'Save'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit}>
        <Textarea
          rows={5}
          value={values.note}
          onChange={(e) => handleChange('note', e.target.value)}
          placeholder="Quick clinical notes…"
          error={errors.note}
        />
      </form>
    </Modal>
  );
}
