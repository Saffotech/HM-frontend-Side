/**
 * Doctor clinical UI ↔ API field mapping (live HTTP only).
 */

import { asList } from '@/shared/api/dataSource';
import { labDepartmentLabel } from '@/shared/utils/labDepartments';
import {
  formatDurationForApi,
  medicineRowFromApi,
} from '@/features/doctor/utils/medicineFields';

function optionalTrim(value) {
  const s = String(value ?? '').trim();
  return s;
}

/** UI medicine row → POST/PUT / consultation prescription item */
export function uiMedicinesToApiItems(medicines = []) {
  return medicines
    .filter((m) => (m.name ?? '').trim())
    .map((m) => {
      const duration = formatDurationForApi(m) || '1 Days';
      const item = {
        medicine_name: m.name.trim(),
        dosage: optionalTrim(m.dosage),
        form: optionalTrim(m.form),
        route: optionalTrim(m.route),
        frequency: optionalTrim(m.frequency),
        timing: optionalTrim(m.timing),
        duration,
        instructions: optionalTrim(m.instructions).slice(0, 200),
      };

      const qty = parseInt(m.quantity, 10);
      if (Number.isFinite(qty) && qty >= 1) {
        item.quantity = qty;
      }

      return item;
    });
}

/** POST /prescriptions and PUT /prescriptions/{id} body — OPD uses appointment_id, IPD uses admission_id. */
export function uiToApiPrescriptionBody({
  appointmentDbId,
  admissionId,
  diagnosis,
  notes,
  medicines,
}) {
  const body = {
    diagnosis: diagnosis || '',
    notes: notes || '',
    items: uiMedicinesToApiItems(medicines),
  };
  if (admissionId != null && admissionId !== '') {
    body.admission_id = Number(admissionId);
  } else if (appointmentDbId != null && appointmentDbId !== '') {
    body.appointment_id = Number(appointmentDbId);
  }
  return body;
}

/** Raw PrescriptionResponse → UI */
export function apiToUiPrescription(api) {
  if (!api) return null;
  const items = api.items ?? [];
  const legacyMed = api.medication ?? api.medicines?.[0]?.name;
  const medicines =
    items.length > 0
      ? items.map((item) => medicineRowFromApi(item))
      : legacyMed
        ? [
            medicineRowFromApi({
              medicine_name: legacyMed,
              dosage: api.dosage ?? '',
              frequency: api.frequency ?? '',
              duration: api.duration ?? '',
              instructions: api.notes ?? '',
            }),
          ]
        : [];

  return {
    id: api.id,
    appointmentId: api.appointment_id ?? api.appointmentId ?? null,
    admissionId: api.admission_id ?? api.admissionId ?? null,
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
    notes: ui.treatmentPlan || ui.notes || '',
    follow_up: ui.followUp || ui.follow_up || undefined,
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

/** POST /lab-tests body — OPD uses appointment_id, IPD uses admission_id.
 * Prefer lab_test_id so backend snapshots catalog name/price. Do not send price.
 */
export function uiToApiLabTestCreate(ui) {
  const departmentId = ui.departmentId ?? ui.department_id;
  const admissionId = ui.admissionId ?? ui.admission_id;
  const labTestId = ui.labTestId ?? ui.lab_test_id;
  const body = {
    priority: ui.priority || 'Normal',
    clinical_notes: ui.clinicalNotes ?? ui.clinical_notes ?? '',
  };
  if (labTestId != null && labTestId !== '') {
    body.lab_test_id = Number(labTestId);
  } else {
    // Temporary name-based compatibility until catalog selection is available
    body.test_name = ui.testName ?? ui.test;
    body.category = ui.category;
  }
  if (admissionId != null && admissionId !== '') {
    body.admission_id = Number(admissionId);
  } else if (ui.appointmentDbId != null && ui.appointmentDbId !== '') {
    body.appointment_id = Number(ui.appointmentDbId);
  }
  const deptNum = Number(departmentId);
  if (departmentId != null && departmentId !== '' && Number.isFinite(deptNum)) {
    body.department_id = deptNum;
  }
  body.is_repeat = Boolean(ui.isRepeat ?? ui.is_repeat);
  return body;
}

/** PUT /lab-tests/{id} — doctor may only change these fields */
export function uiToApiLabTestUpdate(ui) {
  const body = {};
  if (ui.testName !== undefined) body.test_name = ui.testName;
  if (ui.category !== undefined) body.category = ui.category;
  if (ui.priority !== undefined) body.priority = ui.priority;
  if (ui.clinicalNotes !== undefined) body.clinical_notes = ui.clinicalNotes;
  if (ui.departmentId !== undefined || ui.department_id !== undefined) {
    const departmentId = ui.departmentId ?? ui.department_id;
    if (departmentId != null && departmentId !== '') body.department_id = Number(departmentId);
  }
  return body;
}

/** Doctor-facing lab status — only Ordered / Completed / Cancelled. */
export function apiToUiLabStatus(apiStatus) {
  const key = String(apiStatus ?? '').toLowerCase();
  if (key === 'completed') return 'Completed';
  if (key === 'cancelled') return 'Cancelled';
  // ordered + in-lab progress (sample_collected, processing, pending, …)
  if (
    key === 'ordered'
    || key === 'sample_collected'
    || key === 'processing'
    || key === 'pending'
    || key === 'in_progress'
  ) {
    return 'Ordered';
  }
  return null;
}

function formatLabOrderedAt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'numeric',
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
  if (!status) return null;
  const apiStatus = String(api.status ?? '').toLowerCase();
  const patientDbId = api.patient_id ?? api.patientDbId ?? null;
  const patientUid =
    api.patient_uid ?? api.patient_uhid ?? api.patientUid ?? null;
  const displayPatientId =
    patientUid ?? (patientDbId != null ? String(patientDbId) : null);
  const reportAvailable = apiStatus === 'completed';

  return {
    id: api.id,
    appointmentId: api.appointment_id ?? api.appointmentId ?? null,
    admissionId: api.admission_id ?? api.admissionId ?? null,
    encounterType: (api.admission_id ?? api.admissionId) != null ? 'IPD' : 'OPD',
    patientId: displayPatientId,
    patientUid,
    patientDbId: patientDbId != null ? Number(patientDbId) : null,
    patientName: api.patient_name ?? api.patientName,
    testName: api.test_name ?? api.test,
    labTestId: api.lab_test_id ?? api.labTestId ?? null,
    price: api.price != null && api.price !== '' ? String(api.price) : null,
    category: api.category ?? 'Other',
    departmentId: api.department_id ?? api.departmentId ?? null,
    departmentName:
      api.department_name
      || api.departmentName
      || labDepartmentLabel(api.department_code ?? api.departmentCode)
      || null,
    priority: api.priority ?? 'Normal',
    clinicalNotes: api.clinical_notes ?? api.clinicalNotes ?? '',
    registrationSource: api.registration_source ?? api.registrationSource ?? null,
    status,
    apiStatus,
    result: api.result,
    orderedAt: api.created_at ?? api.ordered_at ?? api.date,
    orderedDisplay: formatLabOrderedAt(api.created_at ?? api.ordered_at ?? api.date),
    doctorStatus: status,
    reportAvailable,
    canUpdate: apiStatus === 'ordered',
    canCancel: apiStatus === 'ordered',
  };
}

/** GET /lab-tests/{id}/report → doctor report detail modal */
export function apiToUiDoctorLabReport(api) {
  if (!api) return null;
  return {
    reportId: api.report_id ?? api.reportId,
    orderId: api.order_id ?? api.orderId ?? api.id,
    patientId: api.patient_uid ?? api.patient_uhid ?? api.patient_id,
    patientDbId: api.patient_id ?? null,
    patientName: api.patient_name ?? api.patientName ?? '—',
    testName: api.test_name ?? api.testName ?? '—',
    category: api.category ?? '—',
    priority: api.priority ?? 'Normal',
    orderStatus: api.order_status ?? api.status ?? '—',
    source: api.source ?? '—',
    sampleCollectedAt: api.sample_collected_at ?? null,
    testPerformedAt: api.test_performed_at ?? null,
    remarks: api.remarks ?? '',
    fileName: api.file_name ?? null,
    fileType: api.file_type ?? null,
    fileSize: api.file_size ?? null,
    uploadedByName: api.uploaded_by_name ?? '—',
    uploadedAt: api.uploaded_at ?? api.created_at ?? null,
    parameters: (api.parameters ?? []).map((p) => ({
      id: p.id,
      parameter_name: p.parameter_name ?? '',
      value: p.value ?? '',
      unit: p.unit ?? '',
      normal_range: p.normal_range ?? '',
      flag: p.flag ?? '',
    })),
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
  const list = raw?.items ?? (Array.isArray(raw) ? raw : []);
  return list.map(apiToUiLabTest).filter(Boolean);
}
