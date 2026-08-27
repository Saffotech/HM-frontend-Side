import { useEffect, useMemo, useState } from 'react';
import {
  useDoctorPrescriptionDetailQuery,
  useReplacePrescriptionMutation,
} from '@/features/doctor/hooks/useDoctorPrescriptionQuery';
import { useDoctorAppointmentDetailQuery } from '@/features/doctor/hooks/useDoctorAppointmentQuery';
import { parseEmbeddedClinicalNotes } from '@/features/doctor/utils/clinicalNotesParse';
import {
  dash,
  emptyMedicineRow,
  medicineRowFromApi,
  validateNamedMedicineRow,
} from '@/features/doctor/utils/medicineFields';
import { Modal, Button, Input, Label, Textarea } from '@/shared/components/common';
import { useAuth } from '@/shared/hooks/useAuth';
import { ACTIONS, canAccessAction } from '@/hooks/permissions';
import { toast } from '@/shared/utils/toast';
import PrescriptionMedicineCard from './PrescriptionMedicineCard';
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

const RX_VISIT_MATCH_WINDOW_MS = 5 * 60 * 1000;

function visitSortMs(visit) {
  if (visit?.sortTime != null) return Number(visit.sortTime);
  if (visit?.scheduledAt) {
    const t = new Date(visit.scheduledAt).getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
}

/** IPD Rx: match visit from same consult window — not latest admission visit. */
function findIpdVisitClinicalForPrescription(visits, admissionId, rxDate) {
  if (admissionId == null || !rxDate) return null;
  const rxMs = new Date(rxDate).getTime();
  if (Number.isNaN(rxMs)) return null;

  const pool = (visits ?? []).filter(
    (v) => v.admissionId != null && Number(v.admissionId) === Number(admissionId),
  );
  if (!pool.length) return null;

  const atOrBeforeRx = pool.filter((v) => visitSortMs(v) <= rxMs + RX_VISIT_MATCH_WINDOW_MS);
  if (atOrBeforeRx.length) {
    const best = atOrBeforeRx.reduce((a, b) => (visitSortMs(a) >= visitSortMs(b) ? a : b));
    return {
      symptoms: best.symptoms,
      followUp: best.followUp,
    };
  }

  const rxDay = new Date(rxDate).toDateString();
  const sameDay = pool.filter((v) => {
    const t = visitSortMs(v);
    return t > 0 && new Date(t).toDateString() === rxDay;
  });
  if (sameDay.length) {
    const best = sameDay.reduce((a, b) =>
      Math.abs(visitSortMs(a) - rxMs) <= Math.abs(visitSortMs(b) - rxMs) ? a : b,
    );
    return {
      symptoms: best.symptoms,
      followUp: best.followUp,
    };
  }

  return null;
}

/**
 * Clinical fields for prescription View.
 * OPD: prefer appointment / visit clinical. IPD: Rx notes from prescription record;
 * symptoms/follow-up from the visit matched to Rx date (not latest admission visit).
 */
function clinicalFieldsFromDetail(detail, appointmentClinical = null, { ipdPrescription = false } = {}) {
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
  const notesFromRx =
    parsed.notes ||
    (isEmbeddedBlob ? null : pickClinicalText(rawNotes));
  const notes = ipdPrescription
    ? notesFromRx || '—'
    : pickClinicalText(appointmentClinical?.notes)?.replace(
        /(?:^|\n+)Lab orders:\s*(?:\n- .+)*/gi,
        '',
      ).trim() ||
      notesFromRx ||
      '—';
  return {
    diagnosis: detail?.diagnosis || '—',
    symptoms,
    followUp,
    notes,
  };
}

function medicinesFromDetail(detail) {
  if (!detail?.medicines?.length) {
    return [emptyMedicineRow()];
  }
  return detail.medicines.map((m) => medicineRowFromApi(m));
}

function PrescriptionDetailView({ detail, appointmentClinical, ipdPrescription = false }) {
  const clinical = clinicalFieldsFromDetail(detail, appointmentClinical, { ipdPrescription });

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
                  <th scope="col">Strength</th>
                  <th scope="col">Form</th>
                  <th scope="col">Route</th>
                  <th scope="col">Frequency</th>
                  <th scope="col">Timing</th>
                  <th scope="col">Duration</th>
                  <th scope="col">Qty</th>
                  <th scope="col">Instructions</th>
                </tr>
              </thead>
              <tbody>
                {detail.medicines.map((m, i) => (
                  <tr key={i}>
                    <td className="doc-rx-detail__med-name">{dash(m.name)}</td>
                    <td>{dash(m.dosage)}</td>
                    <td>{dash(m.form)}</td>
                    <td>{dash(m.route)}</td>
                    <td>{dash(m.frequency)}</td>
                    <td>{dash(m.timing)}</td>
                    <td>{dash(m.duration)}</td>
                    <td>{m.quantity != null && m.quantity !== '' ? String(m.quantity) : '—'}</td>
                    <td>{dash(m.instructions)}</td>
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
  addMedicineOnly = false,
  clinical = null,
  lockedMedCount = 0,
}) {
  const editableStart = addMedicineOnly ? lockedMedCount : 0;

  const renderMedicineCards = (rows, indexOffset = 0) =>
    rows.map((m, offset) => {
      const i = indexOffset + offset;
      return (
        <PrescriptionMedicineCard
          key={i}
          medicine={m}
          index={i}
          fieldErrors={fieldErrors}
          canRemove={
            addMedicineOnly
              ? meds.length > lockedMedCount + 1
              : meds.length > 1
          }
          onRemove={() => {
            if (addMedicineOnly && i < lockedMedCount) return;
            setMeds(meds.filter((_, j) => j !== i));
            setFieldErrors((prev) => {
              const next = { ...prev };
              Object.keys(next).forEach((key) => {
                if (key.startsWith('med')) delete next[key];
              });
              return next;
            });
          }}
          onChange={(nextMed) => {
            setMeds(meds.map((x, j) => (j === i ? nextMed : x)));
            setFieldErrors((prev) => {
              const next = { ...prev };
              Object.keys(next).forEach((key) => {
                if (key.endsWith(`_${i}`)) delete next[key];
              });
              return next;
            });
          }}
        />
      );
    });

  if (addMedicineOnly) {
    return (
      <form onSubmit={(e) => e.preventDefault()} className="doc-rx-detail__form">
        <div className="doc-rx-detail__clinical doc-rx-detail__clinical--readonly">
          <div className="doc-rx-detail__clinical-block">
            <span className="doc-rx-detail__clinical-label">Diagnosis</span>
            <p>{clinical?.diagnosis || '—'}</p>
          </div>
          <div className="doc-rx-detail__clinical-block">
            <span className="doc-rx-detail__clinical-label">Symptoms</span>
            <p>{clinical?.symptoms || '—'}</p>
          </div>
          <div className="doc-rx-detail__clinical-block">
            <span className="doc-rx-detail__clinical-label">Notes</span>
            <p>{clinical?.notes || '—'}</p>
          </div>
        </div>

        {lockedMedCount > 0 ? (
          <section className="doc-rx-detail__meds-panel doc-rx-detail__meds-panel--locked">
            <div className="doc-rx-detail__meds-head">
              <span className="doc-rx-detail__meds-title">Existing medicines</span>
              <span className="doc-rx-detail__meds-count">{lockedMedCount}</span>
            </div>
            <div className="table-wrap doc-rx-detail__table-wrap">
              <table className="data-table doc-rx-detail__table">
                <thead>
                  <tr>
                    <th scope="col">Medicine</th>
                    <th scope="col">Strength</th>
                    <th scope="col">Route</th>
                    <th scope="col">Frequency</th>
                    <th scope="col">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {meds.slice(0, lockedMedCount).map((m, i) => (
                    <tr key={`locked-${i}`}>
                      <td className="doc-rx-detail__med-name">{dash(m.name)}</td>
                      <td>{dash(m.dosage)}</td>
                      <td>{dash(m.route)}</td>
                      <td>{dash(m.frequency)}</td>
                      <td>
                        {m.durationValue
                          ? `${m.durationValue} ${m.durationUnit || 'Days'}`
                          : dash(m.duration)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <Label>Add medicines</Label>
        {fieldErrors.medicines && <p className="field__error">{fieldErrors.medicines}</p>}
        {renderMedicineCards(meds.slice(lockedMedCount), lockedMedCount)}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setMeds([...meds, emptyMedicineRow()])}
        >
          + Add medicine
        </Button>
      </form>
    );
  }

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
      {renderMedicineCards(meds, editableStart)}
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
  /** Optional visit-history clinical keyed by IPD admission id (OPD fallback only). */
  clinicalByAdmissionId,
  /** Visit timeline for IPD Rx date-matching (patient profile). */
  visitTimeline = [],
  fallbackAdmissionId = null,
  initialEditing = false,
  readOnly = false,
  /** OPD patient profile — only append medicines; clinical + existing meds stay fixed. */
  addMedicineOnly = false,
}) {
  const { user } = useAuth();
  const canEdit = canAccessAction(user, ACTIONS.UPDATE_PRESCRIPTION);
  const [editing, setEditing] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [meds, setMeds] = useState([emptyMedicineRow()]);
  const [lockedMedCount, setLockedMedCount] = useState(0);
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
  const admissionId = detail?.admissionId ?? fallbackAdmissionId ?? null;
  const { data: appointment } = useDoctorAppointmentDetailQuery(appointmentId, {
    enabled: open && appointmentId != null,
  });

  const replacePrescription = useReplacePrescriptionMutation();

  const isIpdPrescription = admissionId != null && appointmentId == null;

  const ipdClinicalForRx = useMemo(() => {
    if (!isIpdPrescription || !detail?.date) return null;
    return findIpdVisitClinicalForPrescription(visitTimeline, admissionId, detail.date);
  }, [isIpdPrescription, visitTimeline, admissionId, detail?.date]);

  const appointmentClinical = useMemo(() => {
    if (isIpdPrescription) {
      return {
        symptoms: ipdClinicalForRx?.symptoms ?? null,
        followUp: ipdClinicalForRx?.followUp ?? null,
        followUpDate: ipdClinicalForRx?.followUp ?? null,
        notes: null,
      };
    }
    const fromAppointmentVisit =
      appointmentId != null && clinicalByAppointmentId
        ? clinicalByAppointmentId.get(Number(appointmentId)) ??
          clinicalByAppointmentId.get(String(appointmentId))
        : null;
    const fromAdmissionVisit =
      admissionId != null && clinicalByAdmissionId
        ? clinicalByAdmissionId.get(Number(admissionId)) ??
          clinicalByAdmissionId.get(String(admissionId))
        : null;
    const fromVisits = fromAppointmentVisit ?? fromAdmissionVisit;
    return {
      symptoms: appointment?.symptoms ?? fromVisits?.symptoms ?? null,
      followUp: appointment?.followUpDate ?? fromVisits?.followUp ?? null,
      followUpDate: appointment?.followUpDate ?? fromVisits?.followUp ?? null,
      notes: fromVisits?.notes ?? null,
    };
  }, [
    isIpdPrescription,
    ipdClinicalForRx,
    appointment,
    appointmentId,
    admissionId,
    clinicalByAppointmentId,
    clinicalByAdmissionId,
  ]);

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
      return;
    }
    if (initialEditing && canEdit && !readOnly) {
      setEditing(true);
    }
  }, [open, initialEditing, canEdit, readOnly]);

  useEffect(() => {
    if (!editing || !detail) return;
    const clinical = clinicalFieldsFromDetail(detail, appointmentClinical, {
      ipdPrescription: isIpdPrescription,
    });
    const baselineCount = detail.medicines?.length ?? 0;
    const existingMeds = baselineCount > 0 ? medicinesFromDetail(detail) : [];

    if (addMedicineOnly) {
      setDiagnosis(detail.diagnosis ?? '');
      setNotes(detail.notes ?? '');
      setLockedMedCount(baselineCount);
      setMeds([...existingMeds, emptyMedicineRow()]);
    } else {
      setDiagnosis(detail.diagnosis ?? '');
      setNotes(clinical.notes === '—' ? '' : clinical.notes);
      setLockedMedCount(0);
      setMeds(medicinesFromDetail(detail));
    }
    setFieldErrors({});
  }, [editing, detail, appointmentClinical, isIpdPrescription, addMedicineOnly]);

  const handleClose = () => {
    setEditing(false);
    onClose();
  };

  const handleSave = async () => {
    const errs = {};
    const newMedSlice = addMedicineOnly ? meds.slice(lockedMedCount) : meds;
    const saveDiagnosis = addMedicineOnly ? (detail?.diagnosis ?? '') : diagnosis;
    const saveNotes = addMedicineOnly ? (detail?.notes ?? '') : notes;

    if (!addMedicineOnly && !saveDiagnosis.trim()) {
      errs.diagnosis = 'Diagnosis is required';
    }

    const existingMeds = addMedicineOnly && detail
      ? (detail.medicines?.length ? medicinesFromDetail(detail).filter((m) => m.name.trim()) : [])
      : [];
    const newValidMeds = newMedSlice.filter((m) => m.name.trim());

    if (addMedicineOnly) {
      if (!newValidMeds.length) {
        errs.medicines = 'Add at least one new medicine';
      }
    } else {
      const validMedsAll = meds.filter((m) => m.name.trim());
      if (!validMedsAll.length) errs.medicines = 'Add at least one medicine';
    }

    if (addMedicineOnly) {
      newMedSlice.forEach((m, offset) => {
        validateNamedMedicineRow(m, lockedMedCount + offset, errs);
      });
    } else {
      meds.forEach((m, i) => {
        validateNamedMedicineRow(m, i, errs);
      });
    }

    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    const validMeds = addMedicineOnly
      ? [...existingMeds, ...newValidMeds]
      : meds.filter((m) => m.name.trim());

    if (detail?.appointmentId == null && detail?.admissionId == null) {
      toast.error('Prescription link missing (appointment or admission)');
      return;
    }

    try {
      await replacePrescription.mutateAsync({
        id: prescriptionId,
        payload: {
          appointmentDbId: detail.appointmentId ?? undefined,
          admissionId: detail.admissionId ?? undefined,
          patientId,
          patientUid,
          diagnosis: saveDiagnosis,
          notes: saveNotes,
          medicines: validMeds,
        },
      });
      toast.success(addMedicineOnly ? 'Medicine added to prescription' : 'Prescription updated successfully');
      setEditing(false);
    } catch {
      // Toast handled by mutation onError; keep edit mode open with form data
    }
  };

  const editClinical = useMemo(() => {
    if (!detail) return null;
    return clinicalFieldsFromDetail(detail, appointmentClinical, {
      ipdPrescription: isIpdPrescription,
    });
  }, [detail, appointmentClinical, isIpdPrescription]);

  const title = editing
    ? addMedicineOnly
      ? `Add medicine · Prescription #${prescriptionId}`
      : `Edit Prescription #${prescriptionId}`
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
          {!editing && canEdit && !readOnly && detail && !isLoading && !isError && (
            <Button onClick={() => setEditing(true)}>
              {addMedicineOnly ? 'Add medicine' : 'Edit'}
            </Button>
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
          ipdPrescription={isIpdPrescription}
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
          addMedicineOnly={addMedicineOnly}
          clinical={editClinical}
          lockedMedCount={lockedMedCount}
        />
      )}
    </Modal>
  );
}
