import { useEffect, useState } from 'react';
import { useCreatePrescriptionMutation } from '@/features/doctor/hooks/useDoctorPrescriptionQuery';
import { Modal, Button, Input, Label, Textarea } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import {
  emptyMedicineRow,
  validateNamedMedicineRow,
} from '@/features/doctor/utils/medicineFields';
import PrescriptionMedicineCard from './PrescriptionMedicineCard';
import '../styles/doctor-ui.css';

export default function QuickPrescribeModal({
  patient,
  appointment,
  open,
  onClose,
}) {
  const createPrescription = useCreatePrescriptionMutation();

  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [meds, setMeds] = useState([emptyMedicineRow()]);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!open) return;

    setDiagnosis('');
    setNotes('');
    setMeds([emptyMedicineRow()]);
    setFieldErrors({});
  }, [open]);

  if (!patient || !appointment) return null;

  const appointmentDbId = appointment.dbId;
  const patientDbId =
    appointment.patientDbId ?? appointment.queueRow?.patientId;

  const submit = async () => {
    const errs = {};

    if (!diagnosis.trim()) {
      errs.diagnosis = 'Diagnosis is required';
    }

    const validMeds = meds.filter(
      (m) => typeof m.name === 'string' && m.name.trim()
    );

    if (!validMeds.length) {
      errs.medicines = 'Add at least one medicine';
    }

    meds.forEach((m, i) => {
      validateNamedMedicineRow(m, i, errs);
    });

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
        diagnosis: diagnosis.trim(),
        notes: notes.trim(),
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
      title={`Write Prescription · ${patient.name ?? appointment.patientName ?? 'Patient'}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <Button
            disabled={createPrescription.isPending}
            onClick={submit}
          >
            {createPrescription.isPending
              ? 'Saving...'
              : 'Save Prescription'}
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

            if (fieldErrors.diagnosis) {
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.diagnosis;
                return next;
              });
            }
          }}
          error={fieldErrors.diagnosis}
        />

        <Textarea
          label="Notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <Label>Medicines</Label>

        {fieldErrors.medicines && (
          <p className="field__error">{fieldErrors.medicines}</p>
        )}

        {meds.map((m, i) => (
          <PrescriptionMedicineCard
            key={i}
            medicine={m}
            index={i}
            fieldErrors={fieldErrors}
            canRemove={meds.length > 1}
            onRemove={() => {
              setMeds((prev) => prev.filter((_, j) => j !== i));
            }}
            onChange={(nextMed) => {
              setMeds((prev) =>
                prev.map((x, j) => (j === i ? nextMed : x))
              );

              setFieldErrors((prev) => {
                const next = { ...prev };

                Object.keys(next).forEach((key) => {
                  if (key.endsWith(`_${i}`)) {
                    delete next[key];
                  }
                });

                return next;
              });
            }}
          />
        ))}

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setMeds((prev) => [...prev, emptyMedicineRow()]);
          }}
        >
          + Add medicine
        </Button>
      </form>
    </Modal>
  );
}