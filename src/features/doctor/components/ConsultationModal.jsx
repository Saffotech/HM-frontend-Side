import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCreatePrescriptionMutation } from '@/features/doctor/hooks/useDoctorPrescriptionQuery';
import { useCreateLabTestMutation } from '@/features/doctor/hooks/useDoctorLabQuery';
import { useSaveConsultationWorkflowMutation, useConsultationContextQuery } from '@/features/doctor/hooks/useDoctorQueueQuery';
import {
  DEFAULT_MEDICINE,
  LAB_TEST_OPTIONS,
  LAB_CATEGORIES,
  LAB_PRIORITIES,
} from '@/features/doctor/constants';
import { DOCTOR_PATIENT_HISTORY_QUERY_OPTIONS } from '@/features/doctor/utils/doctorPatientProfileCache';
import { getDoctorDisplayStatus } from '@/features/doctor/utils/appointmentWorkflow';
import { stripInternalAppointmentMarkers } from '@/features/opd/utils/appointmentPaymentUtils';
import { Modal, Button, Input, Label, Textarea, Select, QueryFeedback } from '@/shared/components/common';
import { doctorPatientsApi } from '@/shared/api/services';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { toast } from '@/shared/utils/toast';
import '../styles/doctor-ui.css';

function defaultLabCategory(testName) {
  if (/x-ray|mri|ct|scan|ecg|radiology/i.test(testName)) return 'Radiology';
  if (/urine/i.test(testName)) return 'Urine';
  if (testName) return 'Blood';
  return 'Blood';
}

function emptyMedicineRow() {
  return { ...DEFAULT_MEDICINE, durationValue: '', durationUnit: 'Days' };
}

/** Appointment reason defaults like "OPD walk-in" are not real clinical symptoms. */
function symptomsPrefillFromAppointment(detail) {
  const raw = detail?.symptoms ?? detail?.reason ?? '';
  const text = String(raw).trim();
  if (!text) return '';
  if (/^opd\s*walk[-\s]?in$/i.test(text)) return '';
  return text;
}

export default function ConsultationModal({
  appointment,
  open,
  onClose,
  onDone,
}) {
  const token = useQueryToken();
  const saveConsultation = useSaveConsultationWorkflowMutation();
  const createPrescription = useCreatePrescriptionMutation();
  const createLabTest = useCreateLabTestMutation();
  const [tab, setTab] = useState('clinical');
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [meds, setMeds] = useState([emptyMedicineRow()]);
  const [labTest, setLabTest] = useState('');
  const [labCategory, setLabCategory] = useState('Blood');
  const [labPriority, setLabPriority] = useState('Normal');
  const [labClinicalNotes, setLabClinicalNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const appointmentId = appointment?.id;
  const appointmentDbId = appointment?.dbId;
  const patientUid = appointment?.patientUid ?? appointment?.patientId;

  const consultationContextQuery = useConsultationContextQuery(appointmentDbId, {
    enabled: open && appointmentDbId != null,
  });

  const patientHistoryQuery = useQuery({
    queryKey: queryKeys.doctor.patients.history(patientUid),
    queryFn: () => doctorPatientsApi.fetchPatientHistory(patientUid, token),
    enabled: open && Boolean(patientUid) && Boolean(token),
    ...DOCTOR_PATIENT_HISTORY_QUERY_OPTIONS,
  });

  useEffect(() => {
    if (!open || !appointmentId) return;
    setTab('clinical');
    setSymptoms('');
    setDiagnosis('');
    setNotes('');
    setFollowUp('');
    setMeds([emptyMedicineRow()]);
    setLabTest('');
    setLabCategory('Blood');
    setLabPriority('Normal');
    setLabClinicalNotes('');
    setFieldErrors({});
  }, [open, appointmentId]);

  useEffect(() => {
    if (!open) return;
    const detail = consultationContextQuery.data?.appointment;
    if (!detail) return;
    if (!symptoms) setSymptoms(symptomsPrefillFromAppointment(detail));
    if (!diagnosis && detail.diagnosis) setDiagnosis(detail.diagnosis);
    if (!notes && detail.notes) {
      setNotes(stripInternalAppointmentMarkers(detail.notes));
    }
    if (!followUp && detail.followUpDate) setFollowUp(detail.followUpDate);
  }, [open, consultationContextQuery.data, symptoms, diagnosis, notes, followUp]);

  useEffect(() => {
    if (labTest) setLabCategory(defaultLabCategory(labTest));
  }, [labTest]);

  if (!appointment) return null;

  const saving =
    saveConsultation.isPending ||
    createPrescription.isPending ||
    createLabTest.isPending;

  const displayStatus = getDoctorDisplayStatus(
    consultationContextQuery.data?.appointment ?? appointment
  );
  const recentVisits = (patientHistoryQuery.data?.visits ?? []).slice(0, 3);

  const save = async () => {
    const errs = {};
    if (!diagnosis.trim()) errs.diagnosis = 'Diagnosis is required';
    if (labTest && !labCategory) errs.labCategory = 'Category is required';
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
      const prescriptionNotes = [
        symptoms.trim() ? `Symptoms: ${symptoms.trim()}` : '',
        notes.trim(),
        followUp ? `Follow-up: ${followUp}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      try {
        await createPrescription.mutateAsync({
          appointmentDbId,
          patientId: patientDbId,
          patientUid,
          patientName: appointment.patientName,
          diagnosis,
          notes: prescriptionNotes,
          medicines: validMeds,
        });
      } catch (rxErr) {
        const msg = String(rxErr?.message ?? '');
        if (!/already exists/i.test(msg)) {
          throw rxErr;
        }
      }

      if (labTest) {
        try {
          await createLabTest.mutateAsync({
            appointmentDbId,
            patientUid,
            patientName: appointment.patientName,
            testName: labTest,
            category: labCategory,
            priority: labPriority,
            clinicalNotes: labClinicalNotes,
          });
        } catch (labErr) {
          const msg = String(labErr?.message ?? '');
          if (!/already been ordered/i.test(msg)) {
            throw labErr;
          }
        }
      }

      toast.success('Consultation saved');
      onDone();
    } catch {
      // mutation hooks toast via mutationOnError
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={`Consultation · ${appointment.patientName}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving} onClick={save}>
            {saving ? 'Saving...' : 'Save Consultation'}
          </Button>
        </>
      }
    >
      <p className="text-muted" style={{ margin: '0 0 1rem', fontSize: '0.875rem' }}>
        {patientUid ?? '—'}
        <span style={{ marginLeft: '0.75rem' }}>Status: {displayStatus}</span>
        {appointment.time ? (
          <span style={{ marginLeft: '0.75rem' }}>Visit: {appointment.time}</span>
        ) : null}
      </p>

      <QueryFeedback
        isError={consultationContextQuery.isError}
        error={consultationContextQuery.error}
        onRetry={() => consultationContextQuery.refetch()}
      >
        {patientHistoryQuery.isError && (
          <p className="text-muted" style={{ fontSize: '0.8125rem', margin: '0 0 1rem' }}>
            Recent visit history could not be loaded.
          </p>
        )}
        {recentVisits.length > 0 && (
          <div className="doc-consult-history" style={{ marginBottom: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem' }}>Recent visits</h4>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8125rem' }}>
              {recentVisits.map((visit) => (
                <li key={visit.id ?? visit.appointmentDbId}>
                  {visit.dateTime ?? '—'}
                  {visit.diagnosis && visit.diagnosis !== '—' ? ` — ${visit.diagnosis}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </QueryFeedback>

      <div className="doc-modal-tabs">
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
        <div className="doc-page">
          <Textarea label="Symptoms" rows={2} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
          <Input
            label="Diagnosis *"
            value={diagnosis}
            onChange={(e) => {
              setDiagnosis(e.target.value);
              if (fieldErrors.diagnosis) setFieldErrors({});
            }}
            error={fieldErrors.diagnosis}
          />
          <Textarea label="Clinical notes / Treatment plan" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      )}
      {tab === 'rx' && (
        <div>
          <p className="text-muted" style={{ fontSize: '0.8125rem', margin: '0 0 0.75rem' }}>
            Prescription is saved when you click Save Consultation.
          </p>
          <Label>Medicines</Label>
          {meds.map((m, i) => (
            <div key={i} className="doc-med-row">
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
              <Input
                className="doc-med-row__cell"
                placeholder="1-0-1"
                value={m.frequency}
                onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, frequency: e.target.value } : x)))}
              />
              <Input
                className="doc-med-row__cell doc-med-row__duration-value"
                type="number"
                min={1}
                max={365}
                placeholder="e.g. 5"
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
              <Input
                className="doc-med-row__cell"
                placeholder="Instructions"
                value={m.instructions}
                onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, instructions: e.target.value } : x)))}
              />
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setMeds([...meds, emptyMedicineRow()])}>+ Add medicine</Button>
        </div>
      )}
      {tab === 'lab' && (
        <div className="doc-page">
          <p className="text-muted" style={{ fontSize: '0.8125rem', margin: '0 0 0.75rem' }}>
            Lab order is saved when you click Save Consultation.
          </p>
          <Select
            label="Order lab test"
            value={labTest}
            onChange={setLabTest}
            placeholder="None"
            options={[{ value: '', label: 'None' }, ...LAB_TEST_OPTIONS.map((t) => ({ value: t, label: t }))]}
          />
          {labTest && (
            <>
              <Select
                label="Category *"
                value={labCategory}
                onChange={setLabCategory}
                error={fieldErrors.labCategory}
                options={LAB_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
              <Select
                label="Priority"
                value={labPriority}
                onChange={setLabPriority}
                options={LAB_PRIORITIES.map((p) => ({ value: p, label: p }))}
              />
              <Textarea
                label="Clinical notes"
                rows={2}
                value={labClinicalNotes}
                onChange={(e) => setLabClinicalNotes(e.target.value)}
              />
            </>
          )}
          <Input label="Follow-up date" type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
        </div>
      )}
    </Modal>
  );
}
