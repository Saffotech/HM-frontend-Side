import { useState, useEffect, useRef } from 'react';
import { useCreatePrescriptionMutation } from '@/features/doctor/hooks/useDoctorPrescriptionQuery';
import { useCreateLabTestMutation } from '@/features/doctor/hooks/useDoctorLabQuery';
import { useSaveConsultationWorkflowMutation, useConsultationContextQuery } from '@/features/doctor/hooks/useDoctorQueueQuery';
import { useSaveIpdConsultationMutation } from '@/features/doctor/hooks/useSaveIpdConsultationMutation';
import {
  DEFAULT_MEDICINE,
  LAB_DEPARTMENTS,
  LAB_PRIORITIES,
  inferLabCategory,
} from '@/features/doctor/constants';
import { isIpdEncounter } from '@/features/doctor/utils/encounterType';
import {
  clearConsultationDraft,
  loadConsultationDraft,
  saveConsultationDraft,
} from '@/features/doctor/utils/consultationDraftStorage';
import { parseEmbeddedClinicalNotes } from '@/features/doctor/utils/clinicalNotesParse';
import { ipdStaticLabRoutingDepartments } from '@/features/doctor/utils/ipdLabRouting';
import { stripInternalAppointmentMarkers } from '@/features/opd/utils/appointmentPaymentUtils';
import { Modal, Button, Input, Label, Textarea, Select } from '@/shared/components/common';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { useAuthStore } from '@/shared/store/useAuthStore';
import { toast } from '@/shared/utils/toast';
import { useLabRoutingDepartmentsQuery } from '@/shared/hooks/queries/useOpdReferenceQuery';
import { resolveLabDepartmentId, departmentCode, labDepartmentLabel } from '@/shared/utils/labDepartments';
import LabTestNameField from './LabTestNameField';

function emptyMedicineRow() {
  return {
    ...DEFAULT_MEDICINE,
    instructions: '',
    durationValue: '',
    durationUnit: 'Days',
  };
}

function emptyLabOrderRow() {
  return {
    deptCode: '',
    testName: '',
    labTestId: null,
    otherTest: false,
    priority: 'Normal',
    clinicalNotes: '',
  };
}

function labOrdersFromDraft(draft) {
  if (Array.isArray(draft?.labOrders) && draft.labOrders.length) {
    return draft.labOrders.map((row) => ({
      deptCode: row.deptCode ?? '',
      testName: row.testName ?? '',
      labTestId: row.labTestId ?? null,
      otherTest: Boolean(row.otherTest),
      priority: row.priority ?? 'Normal',
      clinicalNotes: row.clinicalNotes ?? '',
    }));
  }
  if (draft?.labTest || draft?.labDeptCode) {
    return [
      {
        deptCode: draft.labDeptCode ?? '',
        testName: draft.labTest ?? '',
        labTestId: draft.labTestId ?? null,
        otherTest: false,
        priority: draft.labPriority ?? 'Normal',
        clinicalNotes: draft.labClinicalNotes ?? '',
      },
    ];
  }
  return [emptyLabOrderRow()];
}

function resetConsultationFormState() {
  return {
    tab: 'clinical',
    symptoms: '',
    diagnosis: '',
    notes: '',
    followUp: '',
    meds: [emptyMedicineRow()],
    labOrders: [emptyLabOrderRow()],
  };
}

function applyDraftToForm(draft) {
  return {
    tab: draft.tab ?? 'clinical',
    symptoms: stripInternalAppointmentMarkers(draft.symptoms ?? ''),
    diagnosis: draft.diagnosis ?? '',
    notes: draft.notes ?? '',
    followUp: draft.followUp ?? '',
    meds: draft.meds?.length ? draft.meds : [emptyMedicineRow()],
    labOrders: labOrdersFromDraft(draft),
  };
}

/** Appointment reason defaults like "OPD walk-in" are not real clinical symptoms. */
function symptomsPrefillFromAppointment(detail) {
  const raw = detail?.symptoms ?? detail?.reason ?? '';
  const text = stripInternalAppointmentMarkers(raw);
  if (!text) return '';
  if (/^opd\s*walk[-\s]?in$/i.test(text)) return '';
  if (/^opd\s*revisit$/i.test(text)) return '';
  return text;
}

export default function ConsultationModal({
  appointment,
  open,
  onClose,
  onDone,
}) {
  const token = useQueryToken();
  const doctorId = useAuthStore((state) => state.user?.id);
  const saveConsultation = useSaveConsultationWorkflowMutation();
  const saveIpdConsultation = useSaveIpdConsultationMutation();
  const createPrescription = useCreatePrescriptionMutation();
  const createLabTest = useCreateLabTestMutation();
  const [tab, setTab] = useState('clinical');
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [meds, setMeds] = useState([emptyMedicineRow()]);
  const [labOrders, setLabOrders] = useState([emptyLabOrderRow()]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [hydratedFromDraft, setHydratedFromDraft] = useState(false);
  const skipDraftPersistRef = useRef(false);

  const isIpdConsult = isIpdEncounter(appointment);
  const admissionId = appointment?.admissionId ?? appointment?.admission_id ?? null;
  const appointmentDbId = isIpdConsult ? null : appointment?.dbId;
  const consultDraftKey = isIpdConsult
    ? (admissionId != null ? `ipd-${admissionId}` : null)
    : appointmentDbId;
  const patientUid = appointment?.patientUid ?? appointment?.patientId;

  const labRoutingQuery = useLabRoutingDepartmentsQuery({ enabled: open });
  const labRoutingDepts = (labRoutingQuery.data?.length
    ? labRoutingQuery.data
    : isIpdConsult
      ? ipdStaticLabRoutingDepartments()
      : []) ?? [];

  const consultationContextQuery = useConsultationContextQuery(appointmentDbId, {
    enabled: open && !isIpdConsult && appointmentDbId != null,
  });

  useEffect(() => {
    if (!open || consultDraftKey == null) {
      setHydratedFromDraft(false);
      return;
    }

    skipDraftPersistRef.current = true;
    const draft = loadConsultationDraft(consultDraftKey, doctorId);
    const next = draft ? applyDraftToForm(draft) : resetConsultationFormState();

    setTab(next.tab);
    setSymptoms(next.symptoms);
    setDiagnosis(next.diagnosis);
    setNotes(next.notes);
    setFollowUp(next.followUp);
    setMeds(next.meds);
    setLabOrders(next.labOrders);
    setFieldErrors({});
    setHydratedFromDraft(Boolean(draft));

    const timer = window.setTimeout(() => {
      skipDraftPersistRef.current = false;
    }, 0);

    return () => window.clearTimeout(timer);
  }, [open, consultDraftKey, doctorId]);

  useEffect(() => {
    if (!open || hydratedFromDraft || isIpdConsult) return;
    const detail = consultationContextQuery.data?.appointment;
    if (!detail) return;

    const parsedNotes = parseEmbeddedClinicalNotes(detail.notes);

    if (!symptoms) {
      setSymptoms(
        symptomsPrefillFromAppointment(detail) || parsedNotes.symptoms || '',
      );
    }
    if (!diagnosis && detail.diagnosis) setDiagnosis(detail.diagnosis);
    if (!notes) {
      const cleanNotes =
        parsedNotes.notes ??
        (detail.notes && !/^\s*symptoms\s*:/i.test(String(detail.notes))
          ? stripInternalAppointmentMarkers(detail.notes)
          : '');
      if (cleanNotes) setNotes(cleanNotes);
    }
    if (!followUp) {
      const nextFollowUp =
        detail.followUpDate ?? detail.followUp ?? parsedNotes.followUp ?? '';
      if (nextFollowUp) setFollowUp(String(nextFollowUp).slice(0, 10));
    }
  }, [
    open,
    hydratedFromDraft,
    isIpdConsult,
    consultationContextQuery.data,
    symptoms,
    diagnosis,
    notes,
    followUp,
  ]);

  useEffect(() => {
    if (!open || consultDraftKey == null || skipDraftPersistRef.current) return;

    saveConsultationDraft(consultDraftKey, doctorId, {
      tab,
      symptoms,
      diagnosis,
      notes,
      followUp,
      meds,
      labOrders,
    });
  }, [
    open,
    consultDraftKey,
    doctorId,
    tab,
    symptoms,
    diagnosis,
    notes,
    followUp,
    meds,
    labOrders,
  ]);

  if (!appointment) return null;

  const saving =
    saveIpdConsultation.isPending ||
    saveConsultation.isPending ||
    createPrescription.isPending ||
    createLabTest.isPending;

  const save = async () => {
    const errs = {};
    if (!diagnosis.trim()) errs.diagnosis = 'Diagnosis is required';
    labOrders.forEach((row, i) => {
      if ((row.testName || row.labTestId != null) && !row.deptCode) {
        errs[`labDept_${i}`] = 'Select Laboratory or Radiology';
      }
      if (row.deptCode && !String(row.testName ?? '').trim() && row.labTestId == null) {
        errs[`labTest_${i}`] = 'Select a catalog test';
      }
      if (row.otherTest && !String(row.testName ?? '').trim()) {
        errs[`labTest_${i}`] = 'Enter a test name';
      }
    });
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

    if (isIpdConsult) {
      if (admissionId == null) {
        toast.error('Admission id missing — cannot save consultation');
        return;
      }
      try {
        const patientDbId = appointment.patientDbId ?? null;

        await saveIpdConsultation.mutateAsync({
          admissionId,
          patientUid,
          clinical: {
            symptoms,
            diagnosis,
            notes,
            followUp,
            meds,
            labOrders,
          },
        });

        const validMeds = meds.filter((m) => m.name.trim());
        try {
          await createPrescription.mutateAsync({
            admissionId,
            patientId: patientDbId,
            patientUid,
            patientName: appointment.patientName,
            diagnosis,
            notes: notes.trim() || undefined,
            medicines: validMeds,
          });
        } catch (rxErr) {
          const msg = String(rxErr?.message ?? '');
          if (!/already exists/i.test(msg)) {
            throw rxErr;
          }
        }

        const filledLabOrders = labOrders.filter(
          (row) =>
            row.deptCode
            && (row.labTestId != null || String(row.testName ?? '').trim()),
        );
        for (const row of filledLabOrders) {
          const departmentId = resolveLabDepartmentId(labRoutingDepts, row.deptCode);
          try {
            await createLabTest.mutateAsync({
              admissionId,
              patientUid,
              patientName: appointment.patientName,
              labTestId: row.labTestId ?? undefined,
              testName: String(row.testName).trim(),
              category: inferLabCategory(row.testName, row.deptCode),
              departmentId: departmentId ?? undefined,
              priority: row.priority || 'Normal',
              clinicalNotes: row.clinicalNotes,
            });
          } catch (labErr) {
            const msg = String(labErr?.message ?? '');
            if (!/already been ordered/i.test(msg)) {
              throw labErr;
            }
          }
        }

        toast.success('IPD consultation saved');
        clearConsultationDraft(consultDraftKey, doctorId);
        onDone();
      } catch {
        // mutation hooks toast via mutationOnError
      }
      return;
    }

    if (appointmentDbId == null) {
      toast.error('Appointment id missing — cannot save consultation');
      return;
    }

    try {
      const patientDbId =
        appointment.patientDbId ?? appointment.queueRow?.patientId ?? null;

      await saveConsultation.mutateAsync({
        appointmentDbId,
        patientUid,
        patientId: patientDbId,
        clinical: {
          symptoms: symptoms.trim() || undefined,
          diagnosis: diagnosis.trim(),
          notes: notes.trim() || undefined,
          follow_up_date: followUp || undefined,
        },
      });

      const validMeds = meds.filter((m) => m.name.trim());
      // Keep prescription notes as clinical notes only — symptoms/follow-up have their own fields
      try {
        await createPrescription.mutateAsync({
          appointmentDbId,
          patientId: patientDbId,
          patientUid,
          patientName: appointment.patientName,
          diagnosis,
          notes: notes.trim() || undefined,
          medicines: validMeds,
        });
      } catch (rxErr) {
        const msg = String(rxErr?.message ?? '');
        if (!/already exists/i.test(msg)) {
          throw rxErr;
        }
      }

      const filledLabOrders = labOrders.filter(
        (row) =>
          row.deptCode
          && (row.labTestId != null || String(row.testName ?? '').trim()),
      );
      for (const row of filledLabOrders) {
        const departmentId = resolveLabDepartmentId(labRoutingDepts, row.deptCode);
        try {
          await createLabTest.mutateAsync({
            appointmentDbId,
            patientUid,
            patientName: appointment.patientName,
            labTestId: row.labTestId ?? undefined,
            testName: String(row.testName).trim(),
            category: inferLabCategory(row.testName, row.deptCode),
            departmentId: departmentId ?? undefined,
            priority: row.priority || 'Normal',
            clinicalNotes: row.clinicalNotes,
          });
        } catch (labErr) {
          const msg = String(labErr?.message ?? '');
          if (!/already been ordered/i.test(msg)) {
            throw labErr;
          }
        }
      }

      toast.success('Consultation saved');
      clearConsultationDraft(consultDraftKey, doctorId);
      onDone();
    } catch {
      // mutation hooks toast via mutationOnError
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={`Consultation · ${appointment.patientName}${isIpdConsult ? ' · IPD' : ''}`}
      size="lg"
      panelClassName="doc-consult-modal"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving} onClick={save}>
            {saving ? 'Saving...' : 'Save Consultation'}
          </Button>
        </>
      }
    >
      <div className="doc-modal-tabs doc-consult-tabs">
        {['clinical', 'rx', 'lab'].map((t) => (
          <button
            key={t}
            type="button"
            className={`doc-modal-tab ${tab === t ? 'doc-modal-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'clinical' ? 'Clinical' : t === 'rx' ? 'Prescription' : 'Lab & Follow-up'}
          </button>
        ))}
      </div>
      {tab === 'clinical' && (
        <div className="doc-consult-panel doc-consult-panel--clinical">
          <Input
            label="Diagnosis *"
            value={diagnosis}
            onChange={(e) => {
              setDiagnosis(e.target.value);
              if (fieldErrors.diagnosis) setFieldErrors({});
            }}
            error={fieldErrors.diagnosis}
          />
          <Textarea label="Symptoms" rows={2} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
          <Textarea label="Treatment plan" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      )}
      {tab === 'rx' && (
        <div className="doc-consult-panel doc-consult-panel--rx">
          <Label className="doc-consult-rx__label">Medicines</Label>
          {meds.map((m, i) => (
            <div key={i} className="doc-med-row doc-med-row--consult">
              <div className="doc-med-row__pair">
                <Input
                  className="doc-med-row__cell"
                  placeholder="Medicine name"
                  value={m.name}
                  onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                />
                <Input
                  className="doc-med-row__cell"
                  placeholder="Dosage - example 200mg"
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
                  placeholder="Instruction - example after food"
                  value={m.instructions}
                  onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, instructions: e.target.value } : x)))}
                />
              </div>
              <div className="doc-med-row__pair">
                <Input
                  className="doc-med-row__cell doc-med-row__duration-value"
                  type="number"
                  min={1}
                  max={365}
                  placeholder="No. of days / weeks / months"
                  value={m.durationValue ?? ''}
                  onChange={(e) => {
                    setMeds(meds.map((x, j) => (j === i ? { ...x, durationValue: e.target.value } : x)));
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
          <Button
            size="sm"
            variant="outline"
            className="doc-consult-rx__add"
            onClick={() => setMeds([...meds, emptyMedicineRow()])}
          >
            + Add medicine
          </Button>
        </div>
      )}
      {tab === 'lab' && (
        <div className="doc-consult-panel doc-consult-panel--lab">
          {labOrders.map((row, i) => {
            return (
              <div key={i} className="doc-lab-order">
                <div className="doc-lab-order__head">
                  <h4 className="doc-lab-order__title">
                    {labOrders.length > 1 ? `Test ${i + 1}` : 'Lab order'}
                  </h4>
                  {labOrders.length > 1 ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setLabOrders((rows) => rows.filter((_, j) => j !== i))
                      }
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
                <div className="doc-lab-order__grid">
                  <Select
                    label="Lab Department *"
                    value={row.deptCode}
                    onChange={(code) => {
                      setLabOrders((rows) =>
                        rows.map((item, j) =>
                          j === i
                            ? {
                                ...item,
                                deptCode: code,
                                testName: '',
                                labTestId: null,
                                otherTest: false,
                              }
                            : item,
                        ),
                      );
                      if (fieldErrors[`labDept_${i}`]) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next[`labDept_${i}`];
                          return next;
                        });
                      }
                    }}
                    placeholder="Laboratory or Radiology"
                    error={fieldErrors[`labDept_${i}`]}
                    options={
                      labRoutingDepts.length
                        ? labRoutingDepts.map((d) => ({
                            value: departmentCode(d) || d.code,
                            label: d.name || d.label || labDepartmentLabel(d),
                          }))
                        : LAB_DEPARTMENTS.map((d) => ({
                            value: d.code,
                            label: d.label,
                          }))
                    }
                  />
                  <LabTestNameField
                    label="Test *"
                    deptCode={row.deptCode}
                    departmentId={resolveLabDepartmentId(labRoutingDepts, row.deptCode)}
                    testName={row.testName}
                    labTestId={row.labTestId}
                    otherTest={row.otherTest}
                    error={fieldErrors[`labTest_${i}`]}
                    onChange={({ testName, otherTest, labTestId }) =>
                      setLabOrders((rows) =>
                        rows.map((item, j) =>
                          j === i
                            ? { ...item, testName, otherTest, labTestId: labTestId ?? null }
                            : item,
                        ),
                      )
                    }
                  />
                  <Select
                    label="Priority"
                    value={row.priority}
                    onChange={(priority) =>
                      setLabOrders((rows) =>
                        rows.map((item, j) =>
                          j === i ? { ...item, priority } : item,
                        ),
                      )
                    }
                    options={LAB_PRIORITIES.map((p) => ({ value: p, label: p }))}
                  />
                </div>
                {row.testName || row.otherTest ? (
                  <Textarea
                    label="Clinical notes"
                    rows={2}
                    value={row.clinicalNotes}
                    onChange={(e) =>
                      setLabOrders((rows) =>
                        rows.map((item, j) =>
                          j === i ? { ...item, clinicalNotes: e.target.value } : item,
                        ),
                      )
                    }
                  />
                ) : null}
              </div>
            );
          })}
          <Button
            size="sm"
            variant="outline"
            className="doc-consult-lab__add"
            onClick={() => setLabOrders((rows) => [...rows, emptyLabOrderRow()])}
          >
            + Add test
          </Button>
          <div className="doc-consult-lab__followup">
            <Input label="Follow-up date" type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
          </div>
        </div>
      )}
    </Modal>
  );
}
