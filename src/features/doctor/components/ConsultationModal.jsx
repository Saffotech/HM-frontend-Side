import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useConsultationContextQuery } from '@/features/doctor/hooks/useDoctorQueueQuery';
import { useDoctorLabTestsQuery } from '@/features/doctor/hooks/useDoctorLabQuery';
import {
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
import { finalizeConsultationOnSave } from '@/features/doctor/utils/consultationSaveWorkflow';
import { finalizeIpdConsultationOnSave } from '@/features/doctor/utils/ipdConsultationSaveWorkflow';
import {
  invalidateDoctorDashboardAfterComplete,
  invalidateDoctorDashboardCore,
  invalidateDoctorIpdAdmissions,
  optimisticallyCompleteAppointment,
} from '@/features/doctor/utils/doctorDashboardCache';
import { isLabRepeatRequired } from '@/features/doctor/utils/labRepeatRequired';
import { stripInternalAppointmentMarkers } from '@/features/opd/utils/appointmentPaymentUtils';
import { Modal, Button, Input, Textarea, Select } from '@/shared/components/common';
import { doctorLabsApi, doctorPrescriptionsApi } from '@/shared/api/services';
import { uiMedicinesToApiItems } from '@/shared/api/mappers/clinicalMapper';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { useAuthStore } from '@/shared/store/useAuthStore';
import { toast } from '@/shared/utils/toast';
import { bumpDoctorIpdCache } from '@/shared/utils/doctorIpdSync';
import { useLabRoutingDepartmentsQuery } from '@/shared/hooks/queries/useOpdReferenceQuery';
import { resolveLabDepartmentId, departmentCode, labDepartmentLabel } from '@/shared/utils/labDepartments';
import LabTestNameField from './LabTestNameField';
import PrescriptionMedicineCard from './PrescriptionMedicineCard';
import {
  emptyMedicineRow,
  validateConsultationMedicineRow,
} from '@/features/doctor/utils/medicineFields';

function emptyLabOrderRow() {
  return {
    deptCode: '',
    testName: '',
    labTestId: null,
    otherTest: false,
    priority: 'Normal',
    clinicalNotes: '',
    isRepeat: false,
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
      isRepeat: Boolean(row.isRepeat),
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
        isRepeat: Boolean(draft.labIsRepeat),
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

function filledLabOrderRows(labOrders) {
  return labOrders.filter(
    (row) =>
      row.deptCode
      && (row.labTestId != null || String(row.testName ?? '').trim()),
  );
}

/** Create all lab orders in parallel; ignore duplicate-order conflicts. */
async function createLabOrdersParallel({
  rows,
  labRoutingDepts,
  token,
  basePayload,
}) {
  if (!rows.length) return;

  const results = await Promise.allSettled(
    rows.map((row) => {
      const departmentId = resolveLabDepartmentId(labRoutingDepts, row.deptCode);
      return doctorLabsApi.addLabTest(
        {
          ...basePayload,
          labTestId: row.labTestId ?? undefined,
          testName: String(row.testName).trim(),
          category: inferLabCategory(row.testName, row.deptCode),
          departmentId: departmentId ?? undefined,
          priority: row.priority || 'Normal',
          clinicalNotes: row.clinicalNotes,
          isRepeat: Boolean(row.isRepeat),
        },
        token,
      );
    }),
  );

  const failures = [];
  for (const result of results) {
    if (result.status !== 'rejected') continue;
    const msg = String(result.reason?.message ?? '');
    if (!/already been ordered/i.test(msg)) {
      failures.push(msg || 'Could not create lab order');
    }
  }
  if (failures.length) {
    throw new Error(failures[0]);
  }
}

async function createPrescriptionIfNeeded({
  token,
  validMeds,
  payload,
}) {
  // Duration filter may drop all rows — never create an empty Rx (shadows nurse detail).
  const apiItems = uiMedicinesToApiItems(validMeds);
  if (!apiItems.length) return;

  const rxPayload = {
    ...payload,
    medicines: validMeds,
  };

  const patientId = payload.patientId ?? payload.patient_id ?? null;

  // If latest Rx for this patient is empty, fill it instead of creating another shell.
  if (patientId != null) {
    try {
      const existing = await doctorPrescriptionsApi.fetchPrescriptionsByPatient(
        patientId,
        token,
      );
      const list = Array.isArray(existing) ? existing : existing?.items ?? [];
      const match =
        list.find((rx) => {
          if (payload.admissionId != null) {
            return Number(rx.admissionId) === Number(payload.admissionId);
          }
          if (payload.appointmentDbId != null) {
            return Number(rx.appointmentId) === Number(payload.appointmentDbId);
          }
          return false;
        }) ?? list[0];
      const hasMeds = (match?.medicines?.length ?? 0) > 0;
      if (match?.id != null && !hasMeds) {
        await doctorPrescriptionsApi.replacePrescription(match.id, rxPayload, token);
        return;
      }
    } catch {
      // Fall through to create
    }
  }

  try {
    await doctorPrescriptionsApi.addPrescription(rxPayload, token);
  } catch (rxErr) {
    const msg = String(rxErr?.message ?? '');
    if (!/already exists/i.test(msg)) throw rxErr;
    if (patientId == null) return;
    try {
      const existing = await doctorPrescriptionsApi.fetchPrescriptionsByPatient(
        patientId,
        token,
      );
      const list = Array.isArray(existing) ? existing : existing?.items ?? [];
      const match =
        list.find((rx) => {
          if (payload.admissionId != null) {
            return Number(rx.admissionId) === Number(payload.admissionId);
          }
          if (payload.appointmentDbId != null) {
            return Number(rx.appointmentId) === Number(payload.appointmentDbId);
          }
          return false;
        }) ?? list[0];
      if (match?.id != null) {
        await doctorPrescriptionsApi.replacePrescription(match.id, rxPayload, token);
      }
    } catch {
      // Ignore — clinical save already succeeded
    }
  }
}

export default function ConsultationModal({
  appointment,
  open,
  onClose,
  onDone,
}) {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  const doctorId = useAuthStore((state) => state.user?.id);
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
  const draftTimerRef = useRef(null);
  const saveLockRef = useRef(false);

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

  const patientDbId = appointment?.patientDbId ?? appointment?.queueRow?.patientId ?? null;
  const labListParams = useMemo(() => {
    if (patientUid) return { patient_uid: String(patientUid), limit: 100 };
    if (patientDbId != null) return { patient_id: Number(patientDbId), limit: 100 };
    return { limit: 100 };
  }, [patientUid, patientDbId]);

  const { data: existingLabTests = [] } = useDoctorLabTestsQuery(labListParams, {
    enabled: open && Boolean(patientUid || patientDbId != null),
  });

  const labVisitContext = useMemo(
    () => ({
      appointmentDbId,
      admissionId,
    }),
    [appointmentDbId, admissionId],
  );

  useEffect(() => {
    if (!open || consultDraftKey == null) {
      setHydratedFromDraft(false);
      return;
    }

    saveLockRef.current = false;
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

    window.clearTimeout(draftTimerRef.current);
    draftTimerRef.current = window.setTimeout(() => {
      saveConsultationDraft(consultDraftKey, doctorId, {
        tab,
        symptoms,
        diagnosis,
        notes,
        followUp,
        meds,
        labOrders,
      });
    }, 400);

    return () => window.clearTimeout(draftTimerRef.current);
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

  const runSaveInBackground = useCallback(
    ({
      patientDbId,
      patientName,
      admissionId: nextAdmissionId,
      appointmentDbId: nextAppointmentDbId,
      clinicalPayload,
      successMessage,
      isIpd,
    }) => {
      const validMeds = meds.filter((m) => m.name.trim());
      const labsToCreate = filledLabOrderRows(labOrders);
      const linkPayload =
        nextAdmissionId != null
          ? { admissionId: nextAdmissionId }
          : { appointmentDbId: nextAppointmentDbId };

      // Instant UX: close modal + update queue before network finishes.
      if (!isIpd && nextAppointmentDbId != null) {
        optimisticallyCompleteAppointment(queryClient, nextAppointmentDbId);
      }
      toast.success(successMessage);
      clearConsultationDraft(consultDraftKey, doctorId);
      onDone?.();

      void (async () => {
        try {
          if (isIpd) {
            await finalizeIpdConsultationOnSave({
              admissionId: nextAdmissionId,
              patientUid,
              token,
              clinical: clinicalPayload,
            });
          } else {
            await finalizeConsultationOnSave({
              appointmentDbId: nextAppointmentDbId,
              token,
              clinical: clinicalPayload,
            });
          }
        } catch (err) {
          toast.error(err?.message || 'Could not save consultation. Please try again.');
          if (isIpd) {
            invalidateDoctorIpdAdmissions(queryClient);
            bumpDoctorIpdCache();
          } else {
            invalidateDoctorDashboardCore(queryClient);
          }
          return;
        }

        try {
          const tasks = [];
          if (validMeds.length > 0) {
            tasks.push(
              createPrescriptionIfNeeded({
                token,
                validMeds,
                payload: {
                  ...linkPayload,
                  patientId: patientDbId,
                  patientUid,
                  patientName,
                  diagnosis,
                  notes: notes.trim() || undefined,
                },
              }),
            );
          }
          if (labsToCreate.length > 0) {
            tasks.push(
              createLabOrdersParallel({
                rows: labsToCreate,
                labRoutingDepts,
                token,
                basePayload: {
                  ...linkPayload,
                  patientUid,
                  patientName,
                },
              }),
            );
          }
          if (tasks.length > 0) {
            await Promise.all(tasks);
          }
        } catch (err) {
          toast.error(
            err?.message
              || 'Consultation saved, but a prescription or lab order failed. Check Labs / Prescriptions.',
          );
        }

        if (isIpd) {
          invalidateDoctorIpdAdmissions(queryClient);
          bumpDoctorIpdCache();
          queryClient.invalidateQueries({
            queryKey: ['doctor', 'ipd', 'nurse-visit-count'],
          });
        } else {
          invalidateDoctorDashboardAfterComplete(queryClient, {
            patientUid,
            patientId: patientDbId,
          });
        }
        if (labsToCreate.length > 0) {
          queryClient.invalidateQueries({ queryKey: queryKeys.doctor.labs });
        }
        if (validMeds.length > 0) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.doctor.prescriptions,
          });
        }
        if (patientUid) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.doctor.patients.history(patientUid),
          });
        }
      })();
    },
    [
      meds,
      labOrders,
      consultDraftKey,
      doctorId,
      onDone,
      token,
      patientUid,
      diagnosis,
      notes,
      labRoutingDepts,
      queryClient,
    ],
  );

  if (!appointment) return null;

  const save = () => {
    if (saveLockRef.current) return;

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
      const repeatRequired = isLabRepeatRequired(row, i, {
        existingOrders: existingLabTests,
        labOrders,
        visit: labVisitContext,
      });
      if (repeatRequired && !row.isRepeat) {
        errs[`labRepeat_${i}`] = 'Check Repeat test — this test was already ordered today';
      }
    });
    meds.forEach((m, i) => {
      validateConsultationMedicineRow(m, i, errs);
    });
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      if (errs.diagnosis) {
        toast.error('Diagnosis is required');
        if (tab !== 'clinical') setTab('clinical');
      } else {
        const hasMedErr = Object.keys(errs).some((key) => key.startsWith('med'));
        if (hasMedErr && tab !== 'rx') setTab('rx');
      }
      return;
    }

    saveLockRef.current = true;

    if (isIpdConsult) {
      if (admissionId == null) {
        saveLockRef.current = false;
        toast.error('Admission id missing — cannot save consultation');
        return;
      }
      runSaveInBackground({
        patientDbId: appointment.patientDbId ?? null,
        patientName: appointment.patientName,
        admissionId,
        isIpd: true,
        clinicalPayload: {
          symptoms,
          diagnosis,
          notes,
          followUp,
          meds,
          labOrders,
        },
        successMessage: 'IPD consultation saved',
      });
      return;
    }

    if (appointmentDbId == null) {
      saveLockRef.current = false;
      toast.error('Appointment id missing — cannot save consultation');
      return;
    }

    runSaveInBackground({
      patientDbId:
        appointment.patientDbId ?? appointment.queueRow?.patientId ?? null,
      patientName: appointment.patientName,
      appointmentDbId,
      isIpd: false,
      clinicalPayload: {
        symptoms: symptoms.trim() || undefined,
        diagnosis: diagnosis.trim(),
        notes: notes.trim() || undefined,
        follow_up_date: followUp || undefined,
      },
      successMessage: 'Consultation saved',
    });
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
          <Button onClick={save}>Save Consultation</Button>
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
          {meds.map((m, i) => (
            <PrescriptionMedicineCard
              key={i}
              medicine={m}
              index={i}
              fieldErrors={fieldErrors}
              showRequiredHints
              requiredWhenNamed={[
                'dosage',
                'frequency',
                'timing',
                'duration',
                'durationUnit',
              ]}
              canRemove={meds.length > 1}
              onAdd={
                i === 0
                  ? () => setMeds([...meds, emptyMedicineRow()])
                  : null
              }
              onRemove={() => {
                setMeds(meds.filter((_, j) => j !== i));
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  Object.keys(next).forEach((key) => {
                    if (key.startsWith('med') && key.includes('_')) delete next[key];
                  });
                  return next;
                });
              }}
              onChange={(nextMed) => {
                setMeds(meds.map((x, j) => (j === i ? nextMed : x)));
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  if (!String(nextMed.name ?? '').trim()) {
                    Object.keys(next).forEach((key) => {
                      if (key.endsWith(`_${i}`)) delete next[key];
                    });
                    return next;
                  }
                  [
                    'medDosage',
                    'medForm',
                    'medRoute',
                    'medFrequency',
                    'medTiming',
                    'medDuration',
                    'medDurationUnit',
                    'medQuantity',
                    'medInstructions',
                  ].forEach((prefix) => {
                    delete next[`${prefix}_${i}`];
                  });
                  return next;
                });
              }}
            />
          ))}
        </div>
      )}
      {tab === 'lab' && (
        <div className="doc-consult-panel doc-consult-panel--lab">
          {labOrders.map((row, i) => {
            const repeatRequired = isLabRepeatRequired(row, i, {
              existingOrders: existingLabTests,
              labOrders,
              visit: labVisitContext,
            });
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
                <label
                  className={`doc-lab-order__repeat${
                    repeatRequired ? ' doc-lab-order__repeat--required' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(row.isRepeat)}
                    required={repeatRequired}
                    aria-required={repeatRequired}
                    onChange={(e) => {
                      setLabOrders((rows) =>
                        rows.map((item, j) =>
                          j === i ? { ...item, isRepeat: e.target.checked } : item,
                        ),
                      );
                      if (fieldErrors[`labRepeat_${i}`]) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next[`labRepeat_${i}`];
                          return next;
                        });
                      }
                    }}
                  />
                  <span>
                    Repeat test
                    {repeatRequired ? ' *' : ''}
                  </span>
                  <span className="doc-lab-order__repeat-hint">
                    {repeatRequired
                      ? 'Required — this test was already ordered today for this visit'
                      : 'Allow ordering again if this test is already in progress'}
                  </span>
                </label>
                {fieldErrors[`labRepeat_${i}`] ? (
                  <p className="field__error">{fieldErrors[`labRepeat_${i}`]}</p>
                ) : null}
                <Textarea
                  className="doc-lab-order__clinical-notes"
                  label="Clinical notes"
                  placeholder="Notes for this test (optional)"
                  rows={2}
                  value={row.clinicalNotes ?? ''}
                  onChange={(e) =>
                    setLabOrders((rows) =>
                      rows.map((item, j) =>
                        j === i ? { ...item, clinicalNotes: e.target.value } : item,
                      ),
                    )
                  }
                />
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
