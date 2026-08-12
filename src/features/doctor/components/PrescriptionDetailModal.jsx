import { useEffect, useMemo, useState } from 'react';
import {
  useDoctorPrescriptionDetailQuery,
  useReplacePrescriptionMutation,
} from '@/features/doctor/hooks/useDoctorPrescriptionQuery';
import { useDoctorAppointmentDetailQuery } from '@/features/doctor/hooks/useDoctorAppointmentQuery';
import { DEFAULT_MEDICINE } from '@/features/doctor/constants';
import { parseEmbeddedClinicalNotes } from '@/features/doctor/utils/clinicalNotesParse';
import { Modal, Button, Input, Label, Textarea } from '@/shared/components/common';
import { useAuth } from '@/shared/hooks/useAuth';
import { ACTIONS, canAccessAction } from '@/hooks/permissions';
import { toast } from '@/shared/utils/toast';
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

function pickClinicalText(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text && text !== '—' ? text : null;
}

/**
 * Clinical fields for prescription View.
 * Prefer appointment symptoms / follow-up (where consultation saves them);
 * fall back to legacy "Symptoms: … Follow-up: …" blobs in notes.
 */
function clinicalFieldsFromDetail(detail, appointmentClinical = null) {
  const parsed = parseEmbeddedClinicalNotes(detail?.notes);
  const rawNotes = detail?.notes;
  const isEmbeddedBlob = rawNotes && /^\s*symptoms\s*:/i.test(String(rawNotes));
  const symptoms =
    pickClinicalText(appointmentClinical?.symptoms) ||
    pickClinicalText(parsed.symptoms) ||
    '—';
  const followUp =
    formatFollowUpLabel(
      pickClinicalText(appointmentClinical?.followUp) ||
        pickClinicalText(appointmentClinical?.followUpDate) ||
        pickClinicalText(parsed.followUp),
    ) || '—';
  return {
    diagnosis: detail?.diagnosis || '—',
    symptoms,
    followUp,
    notes: parsed.notes || (isEmbeddedBlob ? '—' : rawNotes) || '—',
  };
}

function emptyMedicineRow() {
  return { ...DEFAULT_MEDICINE, durationValue: '', durationUnit: 'Days' };
}

function parseDurationFields(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return { durationValue: '', durationUnit: 'Days' };
  const match = text.match(/^(\d+)\s*(days?|weeks?|months?)?$/i);
  if (match) {
    const unitRaw = (match[2] || 'Days').toLowerCase();
    let durationUnit = 'Days';
    if (unitRaw.startsWith('week')) durationUnit = 'Weeks';
    else if (unitRaw.startsWith('month')) durationUnit = 'Months';
    return { durationValue: match[1], durationUnit };
  }
  const digits = text.match(/(\d+)/);
  return { durationValue: digits ? digits[1] : '', durationUnit: 'Days' };
}

function medicinesFromDetail(detail) {
  if (!detail?.medicines?.length) {
    return [emptyMedicineRow()];
  }
  return detail.medicines.map((m) => {
    const { durationValue, durationUnit } = parseDurationFields(m.duration);
    return {
      name: m.name ?? '',
      dosage: m.dosage ?? '',
      frequency: m.frequency ?? '',
      duration: m.duration != null ? String(m.duration) : '',
      durationValue,
      durationUnit,
      instructions: m.instructions ?? '',
    };
  });
}

function PrescriptionDetailView({ detail, appointmentClinical }) {
  const clinical = clinicalFieldsFromDetail(detail, appointmentClinical);

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
        <div key={i} className="doc-med-row doc-med-row--consult">
          <div className="doc-med-row__pair">
            <Input
              className="doc-med-row__cell"
              placeholder="Name"
              value={m.name}
              onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            />
            <Input
              className="doc-med-row__cell"
              placeholder="Dosage"
              value={m.dosage}
              onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, dosage: e.target.value } : x)))}
            />
          </div>
          <div className="doc-med-row__pair">
            <Input
              className="doc-med-row__cell"
              placeholder="1-0-1"
              value={m.frequency}
              onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, frequency: e.target.value } : x)))}
            />
            <Input
              className="doc-med-row__cell"
              placeholder="Instructions"
              value={m.instructions}
              onChange={(e) =>
                setMeds(meds.map((x, j) => (j === i ? { ...x, instructions: e.target.value } : x)))
              }
            />
          </div>
          <div className="doc-med-row__pair">
            <Input
              className="doc-med-row__cell doc-med-row__duration-value"
              type="number"
              min={1}
              max={365}
              placeholder="e.g. 5"
              value={m.durationValue ?? ''}
              onChange={(e) => {
                setMeds(
                  meds.map((x, j) => (j === i ? { ...x, durationValue: e.target.value } : x)),
                );
                if (fieldErrors[`medDuration_${i}`]) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next[`medDuration_${i}`];
                    return next;
                  });
                }
              }}
              error={fieldErrors[`medDuration_${i}`]}
            />
            <select
              className="doc-med-row__duration-unit"
              value={m.durationUnit ?? 'Days'}
              onChange={(e) =>
                setMeds(meds.map((x, j) => (j === i ? { ...x, durationUnit: e.target.value } : x)))
              }
              aria-label="Duration unit"
            >
              <option value="Days">Days</option>
              <option value="Weeks">Weeks</option>
              <option value="Months">Months</option>
            </select>
          </div>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={() => setMeds([...meds, emptyMedicineRow()])}>
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
  /** Optional visit-history clinical keyed by appointment id (instant while appointment loads). */
  clinicalByAppointmentId,
}) {
  const { user } = useAuth();
  const canEdit = canAccessAction(user, ACTIONS.UPDATE_PRESCRIPTION);
  const [editing, setEditing] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [meds, setMeds] = useState([emptyMedicineRow()]);
  const [fieldErrors, setFieldErrors] = useState({});

  const {
    data: detail,
    isLoading,
    isError,
    error,
  } = useDoctorPrescriptionDetailQuery(prescriptionId, {
    enabled: open && prescriptionId != null,
  });

  const appointmentId = detail?.appointmentId ?? null;
  const { data: appointment } = useDoctorAppointmentDetailQuery(appointmentId, {
    enabled: open && appointmentId != null,
  });

  const replacePrescription = useReplacePrescriptionMutation();

  const appointmentClinical = useMemo(() => {
    const fromVisits =
      appointmentId != null && clinicalByAppointmentId
        ? clinicalByAppointmentId.get(Number(appointmentId)) ??
          clinicalByAppointmentId.get(String(appointmentId))
        : null;
    return {
      symptoms: appointment?.symptoms ?? fromVisits?.symptoms ?? null,
      followUp: appointment?.followUpDate ?? fromVisits?.followUp ?? null,
      followUpDate: appointment?.followUpDate ?? fromVisits?.followUp ?? null,
    };
  }, [appointment, appointmentId, clinicalByAppointmentId]);

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
    const clinical = clinicalFieldsFromDetail(detail, appointmentClinical);
    setDiagnosis(detail.diagnosis ?? '');
    // Edit form keeps real notes only — not the legacy Symptoms/Follow-up blob
    setNotes(clinical.notes === '—' ? '' : clinical.notes);
    setMeds(medicinesFromDetail(detail));
    setFieldErrors({});
  }, [editing, detail, appointmentClinical]);

  const handleClose = () => {
    setEditing(false);
    onClose();
  };

  const handleSave = async () => {
    const errs = {};
    if (!diagnosis.trim()) errs.diagnosis = 'Diagnosis is required';
    const validMeds = meds.filter((m) => m.name.trim());
    if (!validMeds.length) errs.medicines = 'Add at least one medicine';
    meds.forEach((m, i) => {
      if (m.name.trim()) {
        const durationValue = parseInt(m.durationValue, 10);
        if (!durationValue || durationValue <= 0) {
          errs[`medDuration_${i}`] = 'Duration must be a number greater than 0';
        }
      }
    });
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
      panelClassName="doc-rx-detail-modal"
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
        <PrescriptionDetailView
          detail={displayDetail}
          appointmentClinical={appointmentClinical}
        />
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
