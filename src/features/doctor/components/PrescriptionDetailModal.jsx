import { useEffect, useMemo, useState } from 'react';
import {
  useDoctorPrescriptionDetailQuery,
  useReplacePrescriptionMutation,
} from '@/features/doctor/hooks/useDoctorPrescriptionQuery';
import { DEFAULT_MEDICINE } from '@/features/doctor/constants';
import { parseEmbeddedClinicalNotes } from '@/features/doctor/utils/clinicalNotesParse';
import { Modal, Button, Input, Label, Textarea } from '@/shared/components/common';
import { useAuth } from '@/shared/hooks/useAuth';
import { ACTIONS, canAccessAction } from '@/hooks/permissions';
import { toast } from '@/shared/utils/toast';
import StatusPill from './StatusPill';
import '../styles/doctor-ui.css';

function formatDetailDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatFollowUpLabel(value) {
  if (!value) return null;
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return String(value);
}

/** Split legacy "Symptoms: … Follow-up: …" blobs into dedicated display fields. */
function clinicalFieldsFromDetail(detail) {
  const parsed = parseEmbeddedClinicalNotes(detail?.notes);
  const rawNotes = detail?.notes;
  const isEmbeddedBlob = rawNotes && /^\s*symptoms\s*:/i.test(String(rawNotes));
  return {
    diagnosis: detail?.diagnosis || '—',
    symptoms: parsed.symptoms || '—',
    followUp: formatFollowUpLabel(parsed.followUp) || '—',
    notes: parsed.notes || (isEmbeddedBlob ? '—' : rawNotes) || '—',
  };
}

function medicinesFromDetail(detail) {
  if (!detail?.medicines?.length) {
    return [{ ...DEFAULT_MEDICINE }];
  }
  return detail.medicines.map((m) => ({
    name: m.name ?? '',
    dosage: m.dosage ?? '',
    frequency: m.frequency ?? '',
    duration: m.duration != null ? String(m.duration) : '',
    instructions: m.instructions ?? '',
  }));
}

function PrescriptionDetailView({ detail }) {
  const clinical = clinicalFieldsFromDetail(detail);

  return (
    <div className="doc-rx-detail doc-rx-detail--modal">
      <div className="doc-rx-detail__summary">
        <div className="doc-rx-detail__summary-item">
          <span className="doc-rx-detail__summary-label">Prescription ID</span>
          <strong>#{detail.id}</strong>
        </div>
        <div className="doc-rx-detail__summary-item">
          <span className="doc-rx-detail__summary-label">Patient</span>
          <strong>{detail.patientName || '—'}</strong>
        </div>
        <div className="doc-rx-detail__summary-item">
          <span className="doc-rx-detail__summary-label">Doctor</span>
          <strong>{detail.doctor || '—'}</strong>
        </div>
        <div className="doc-rx-detail__summary-item">
          <span className="doc-rx-detail__summary-label">Created</span>
          <strong>{formatDetailDate(detail.date)}</strong>
        </div>
        <div className="doc-rx-detail__summary-item doc-rx-detail__summary-item--status">
          <span className="doc-rx-detail__summary-label">Status</span>
          {detail.status ? <StatusPill status={detail.status} /> : '—'}
        </div>
      </div>

      <div className="doc-rx-detail__clinical">
        <div className="doc-rx-detail__clinical-block">
          <span className="doc-rx-detail__clinical-label">Diagnosis</span>
          <p>{clinical.diagnosis}</p>
        </div>
        <div className="doc-rx-detail__clinical-block">
          <span className="doc-rx-detail__clinical-label">Symptoms</span>
          <p>{clinical.symptoms}</p>
        </div>
        <div className="doc-rx-detail__clinical-block">
          <span className="doc-rx-detail__clinical-label">Follow-up</span>
          <p>{clinical.followUp}</p>
        </div>
        <div className="doc-rx-detail__clinical-block">
          <span className="doc-rx-detail__clinical-label">Notes</span>
          <p>{clinical.notes}</p>
        </div>
      </div>

      <section className="doc-rx-detail__meds-panel">
        <div className="doc-rx-detail__meds-head">
          <span className="doc-rx-detail__meds-title">Medicines</span>
          {detail.medicines?.length ? (
            <span className="doc-rx-detail__meds-count">{detail.medicines.length}</span>
          ) : null}
        </div>
        {detail.medicines?.length ? (
          <div className="table-wrap doc-rx-detail__table-wrap">
            <table className="data-table doc-rx-detail__table">
              <thead>
                <tr>
                  <th scope="col">Medicine</th>
                  <th scope="col">Dosage</th>
                  <th scope="col">Frequency</th>
                  <th scope="col">Duration</th>
                  <th scope="col">Instructions</th>
                </tr>
              </thead>
              <tbody>
                {detail.medicines.map((m, i) => (
                  <tr key={i}>
                    <td className="doc-rx-detail__med-name">{m.name || '—'}</td>
                    <td>{m.dosage || '—'}</td>
                    <td>{m.frequency || '—'}</td>
                    <td>{m.duration ?? '—'}</td>
                    <td>{m.instructions || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted doc-rx-detail__empty">No medicines listed.</p>
        )}
      </section>
    </div>
  );
}

function PrescriptionEditForm({
  diagnosis,
  setDiagnosis,
  notes,
  setNotes,
  meds,
  setMeds,
  fieldErrors,
  setFieldErrors,
}) {
  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="doc-rx-detail__form"
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
          <Input
            placeholder="Dosage"
            value={m.dosage}
            onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, dosage: e.target.value } : x)))}
          />
          <Input
            placeholder="1-0-1"
            value={m.frequency}
            onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, frequency: e.target.value } : x)))}
          />
          <Input
            placeholder="Duration"
            value={m.duration}
            onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, duration: e.target.value } : x)))}
          />
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
  );
}

export default function PrescriptionDetailModal({
  prescriptionId,
  open,
  onClose,
  patientId,
  patientUid,
  patientName: patientNameProp,
  doctorName: doctorNameProp,
}) {
  const { user } = useAuth();
  const canEdit = canAccessAction(user, ACTIONS.UPDATE_PRESCRIPTION);
  const [editing, setEditing] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [meds, setMeds] = useState([{ ...DEFAULT_MEDICINE }]);
  const [fieldErrors, setFieldErrors] = useState({});

  const {
    data: detail,
    isLoading,
    isError,
    error,
  } = useDoctorPrescriptionDetailQuery(prescriptionId, {
    enabled: open && prescriptionId != null,
  });

  const replacePrescription = useReplacePrescriptionMutation();

  const displayDetail = useMemo(() => {
    if (!detail) return null;
    const doctorFallback = doctorNameProp || user?.full_name || user?.name;
    return {
      ...detail,
      patientName: detail.patientName || patientNameProp,
      doctor: detail.doctor || doctorFallback,
    };
  }, [detail, patientNameProp, doctorNameProp, user]);

  useEffect(() => {
    if (!open) {
      setEditing(false);
      setFieldErrors({});
    }
  }, [open]);

  useEffect(() => {
    if (!editing || !detail) return;
    const clinical = clinicalFieldsFromDetail(detail);
    setDiagnosis(detail.diagnosis ?? '');
    // Edit form keeps real notes only — not the legacy Symptoms/Follow-up blob
    setNotes(clinical.notes === '—' ? '' : clinical.notes);
    setMeds(medicinesFromDetail(detail));
    setFieldErrors({});
  }, [editing, detail]);

  const handleClose = () => {
    setEditing(false);
    onClose();
  };

  const handleSave = async () => {
    const errs = {};
    if (!diagnosis.trim()) errs.diagnosis = 'Diagnosis is required';
    const validMeds = meds.filter((m) => m.name.trim());
    if (!validMeds.length) errs.medicines = 'Add at least one medicine';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    if (detail?.appointmentId == null) {
      toast.error('Appointment id missing on prescription');
      return;
    }

    try {
      await replacePrescription.mutateAsync({
        id: prescriptionId,
        payload: {
          appointmentDbId: detail.appointmentId,
          patientId,
          patientUid,
          diagnosis,
          notes,
          medicines: validMeds,
        },
      });
      toast.success('Prescription updated successfully');
      setEditing(false);
    } catch {
      // Toast handled by mutation onError; keep edit mode open with form data
    }
  };

  const title = editing
    ? `Edit Prescription #${prescriptionId}`
    : `Prescription #${prescriptionId}`;

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
          {!editing && canEdit && detail && !isLoading && !isError && (
            <Button onClick={() => setEditing(true)}>Edit</Button>
          )}
          {editing && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setFieldErrors({});
                }}
                disabled={replacePrescription.isPending}
              >
                Cancel
              </Button>
              <Button disabled={replacePrescription.isPending} onClick={handleSave}>
                {replacePrescription.isPending ? 'Saving…' : 'Save'}
              </Button>
            </>
          )}
        </>
      }
    >
      {isLoading && <p className="text-muted">Loading prescription…</p>}
      {isError && (
        <p className="field__error">{error?.message || 'Unable to load prescription'}</p>
      )}
      {!isLoading && !isError && displayDetail && !editing && (
        <PrescriptionDetailView detail={displayDetail} />
      )}
      {!isLoading && !isError && detail && editing && (
        <PrescriptionEditForm
          diagnosis={diagnosis}
          setDiagnosis={setDiagnosis}
          notes={notes}
          setNotes={setNotes}
          meds={meds}
          setMeds={setMeds}
          fieldErrors={fieldErrors}
          setFieldErrors={setFieldErrors}
        />
      )}
    </Modal>
  );
}
