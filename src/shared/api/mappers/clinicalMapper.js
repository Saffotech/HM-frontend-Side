/**
 * Doctor clinical UI ↔ API field mapping (live HTTP only).
 */

import { asList } from '@/shared/api/dataSource';

/** DB stores duration as integer — send numeric value only. */
function durationToApiValue(m) {
  if (m.durationValue != null && String(m.durationValue).trim() !== '') {
    const n = parseInt(m.durationValue, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  const match = String(m.duration ?? '').trim().match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/** UI medicine row → POST/PUT prescription item */
export function uiMedicinesToApiItems(medicines = []) {
  return medicines
    .filter((m) => (m.name ?? '').trim())
    .map((m) => ({
      medicine_name: m.name.trim(),
      dosage: m.dosage || '',
      frequency: m.frequency || '',
      duration: durationToApiValue(m),
      instructions: m.instructions || '',
    }))
    .filter((item) => item.duration > 0);
}

/** POST /prescriptions and PUT /prescriptions/{id} body */
export function uiToApiPrescriptionBody({ appointmentDbId, diagnosis, notes, medicines }) {
  return {
    appointment_id: appointmentDbId,
    diagnosis: diagnosis || '',
    notes: notes || '',
    items: uiMedicinesToApiItems(medicines),
  };
}

/** Raw PrescriptionResponse → UI */
export function apiToUiPrescription(api) {
  if (!api) return null;
  const items = api.items ?? [];
  const legacyMed = api.medication ?? api.medicines?.[0]?.name;
  const medicines =
    items.length > 0
      ? items.map((item) => ({
          name: item.medicine_name ?? item.name ?? '',
          dosage: item.dosage ?? '',
          frequency: item.frequency ?? '',
          duration: item.duration ?? '',
          instructions: item.instructions ?? '',
        }))
      : legacyMed
        ? [
            {
              name: legacyMed,
              dosage: api.dosage ?? '',
              frequency: api.frequency ?? '',
              duration: api.duration ?? '',
              instructions: api.notes ?? '',
            },
          ]
        : [];

  return {
    id: api.id,
    appointmentId: api.appointment_id ?? api.appointmentId,
    patientId: api.patient_id ?? api.patientId,
    patientUid: api.patient_uhid ?? api.patientUid,
    patientName: api.patient_name ?? api.patientName,
    doctor: api.doctor_name ?? api.doctor,
    diagnosis: api.diagnosis,
    notes: api.notes,
    status: api.status ?? null,
    date: api.created_at ?? api.date,
    medicines,
  };
}

export function mapPrescriptionList(raw) {
  return asList(raw).map(apiToUiPrescription).filter(Boolean);
}

export function uiRecordToApiCreate(ui) {
  return {
    patient_id: ui.patientId,
    chief_complaint: ui.symptoms || ui.chiefComplaint || '',
    diagnosis: ui.diagnosis || '',
    notes: [ui.treatmentPlan, ui.notes, ui.followUp].filter(Boolean).join('\n'),
    vital_signs: ui.vitalSigns || {},
  };
}

export function uiRecordToApiPatch(ui) {
  return uiRecordToApiCreate(ui);
}

export function apiToUiRecord(api) {
  if (!api) return null;
  return {
    id: api.id,
    patientId: api.patient_id ?? api.patientId,
    diagnosis: api.diagnosis,
    treatmentPlan: api.notes ?? api.treatment_plan,
    symptoms: api.chief_complaint ?? api.symptoms,
    notes: api.notes,
    followUp: api.follow_up ?? api.followUp,
    date: api.created_at ?? api.date,
    doctor: api.doctor_name ?? api.doctor,
  };
}

/** POST /lab-tests body */
export function uiToApiLabTestCreate(ui) {
  return {
    appointment_id: ui.appointmentDbId,
    test_name: ui.testName ?? ui.test,
    category: ui.category,
    priority: ui.priority || 'Normal',
    clinical_notes: ui.clinicalNotes ?? ui.clinical_notes ?? '',
  };
}

/** PUT /lab-tests/{id} — doctor may only change these fields */
export function uiToApiLabTestUpdate(ui) {
  const body = {};
  if (ui.testName !== undefined) body.test_name = ui.testName;
  if (ui.category !== undefined) body.category = ui.category;
  if (ui.priority !== undefined) body.priority = ui.priority;
  if (ui.clinicalNotes !== undefined) body.clinical_notes = ui.clinicalNotes;
  return body;
}

export function apiToUiLabStatus(apiStatus) {
  const map = {
    ordered: 'Ordered',
    sample_collected: 'Sample Collected',
    processing: 'Processing',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  const key = String(apiStatus ?? '').toLowerCase();
  return map[key] ?? apiStatus;
}

function formatLabOrderedAt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Raw lab test response → doctor Labs UI row */
export function apiToUiLabTest(api) {
  if (!api) return null;
  const status = apiToUiLabStatus(api.status);
  const hasReport =
    status === 'Completed' &&
    Boolean(api.result ?? api.report_url ?? api.report_available);
  return {
    id: api.id,
    appointmentId: api.appointment_id ?? api.appointmentId,
    patientId: api.patient_uhid ?? api.patient_id ?? api.patientId,
    patientName: api.patient_name ?? api.patientName,
    testName: api.test_name ?? api.test,
    category: api.category ?? 'Other',
    priority: api.priority ?? 'Normal',
    clinicalNotes: api.clinical_notes ?? api.clinicalNotes ?? '',
    status,
    apiStatus: String(api.status ?? '').toLowerCase(),
    result: api.result,
    orderedAt: api.created_at ?? api.ordered_at ?? api.date,
    orderedDisplay: formatLabOrderedAt(api.created_at ?? api.ordered_at ?? api.date),
    doctorStatus: status,
    reportAvailable: hasReport,
    canUpdate: String(api.status ?? '').toLowerCase() === 'ordered',
    canCancel: String(api.status ?? '').toLowerCase() === 'ordered',
  };
}

/** @deprecated Use apiToUiLabTest */
export function apiToUiLab(api) {
  const row = apiToUiLabTest(api);
  if (!row) return null;
  return {
    id: row.id,
    patientId: row.patientId,
    patientName: row.patientName,
    test: row.testName,
    status: row.status,
    result: row.result,
    notes: row.clinicalNotes,
    date: row.orderedAt,
  };
}

export function mapLabTestList(raw) {
  return asList(raw).map(apiToUiLabTest).filter(Boolean);
}

export function apiToUiNotification(api) {
  if (!api) return null;
  return {
    id: api.id,
    kind: api.kind,
    title: api.title,
    body: api.body,
    at: api.created_at ?? api.at,
    read: Boolean(api.read),
  };
}
