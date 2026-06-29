import { useEffect, useState } from 'react';
import { useCreatePrescriptionMutation } from '@/features/doctor/hooks/useDoctorPrescriptionQuery';
import { DEFAULT_MEDICINE } from '@/features/doctor/constants';
import { Modal, Button, Input, Label, Textarea } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import '../styles/doctor-ui.css';

export default function QuickPrescribeModal({ patient, appointment, open, onClose }) {
  const createPrescription = useCreatePrescriptionMutation();
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [meds, setMeds] = useState([{ ...DEFAULT_MEDICINE }]);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setDiagnosis('');
    setNotes('');
    setMeds([{ ...DEFAULT_MEDICINE }]);
    setFieldErrors({});
  }, [open]);

  if (!patient || !appointment) return null;

  const appointmentDbId = appointment.dbId;
  const patientDbId = appointment.patientDbId ?? appointment.queueRow?.patientId;

  const submit = async () => {
    const errs = {};
    if (!diagnosis.trim()) errs.diagnosis = 'Diagnosis is required';
    const validMeds = meds.filter((m) => m.name.trim());
    if (!validMeds.length) errs.medicines = 'Add at least one medicine';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    if (appointmentDbId == null) {
      toast.error('Appointment id missing');
      return;
    }

    try {
      await createPrescription.mutateAsync({
        appointmentDbId,
        patientId: patientDbId,
        patientName: patient.name ?? appointment.patientName,
        diagnosis,
        notes,
        medicines: validMeds,
      });
      toast.success('Prescription saved');
      onClose();
    } catch (err) {
      toast.error(err?.message ?? 'Failed to save prescription');
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={`Write Prescription · ${patient.name}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={createPrescription.isPending} onClick={submit}>
            {createPrescription.isPending ? 'Saving...' : 'Save Prescription'}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Input
          label="Diagnosis *"
          value={diagnosis}
          onChange={(e) => {
            setDiagnosis(e.target.value);
            if (fieldErrors.diagnosis) setFieldErrors({});
          }}
          error={fieldErrors.diagnosis}
        />
        <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Label>Medicines</Label>
        {fieldErrors.medicines && <p className="field__error">{fieldErrors.medicines}</p>}
        {meds.map((m, i) => (
          <div key={i} className="doc-med-row">
            <Input
              placeholder="Name"
              value={m.name}
              onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            />
            <Input placeholder="Dosage" value={m.dosage} onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, dosage: e.target.value } : x)))} />
            <Input placeholder="1-0-1" value={m.frequency} onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, frequency: e.target.value } : x)))} />
            <Input placeholder="Duration" value={m.duration} onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, duration: e.target.value } : x)))} />
            <Input
              placeholder="Instructions"
              value={m.instructions}
              onChange={(e) =>
                setMeds(meds.map((x, j) => (j === i ? { ...x, instructions: e.target.value } : x)))
              }
            />
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => setMeds([...meds, { ...DEFAULT_MEDICINE }])}>
          + Add medicine
        </Button>
      </form>
    </Modal>
  );
}
