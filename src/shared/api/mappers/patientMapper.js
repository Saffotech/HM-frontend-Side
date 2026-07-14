/**
 * Patient UI ↔ API field mapping (live HTTP only).
 */

import {
  formatAadhaarDisplay,
  validatePaymentTransactionRef,
} from '@/shared/utils/validators';

const GENDER_TO_API = { Male: 1, Female: 2, Other: 3, 'Prefer not to say': 4 };

/** UI display date (en-GB) — matches mock seed format e.g. "15 Jan 2024" */
export function formatPatientRegisteredDate(raw) {
  if (raw == null || raw === '') return '—';
  if (typeof raw === 'string' && !raw.includes('T') && !/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function apiToUiPatient(apiPatient) {
  if (!apiPatient) return null;
  return {
    id: apiPatient.patient_uid ?? apiPatient.id,
    dbId: apiPatient.id,
    name:
      apiPatient.full_name ??
      `${apiPatient.first_name ?? ''} ${apiPatient.last_name ?? ''}`.trim() ??
      apiPatient.name,
    age: apiPatient.age,
    gender: apiPatient.gender,
    phone: apiPatient.phone_number ?? apiPatient.phone,
    email: apiPatient.email,
    address: apiPatient.address,
    bloodGroup: apiPatient.blood_group ?? apiPatient.bloodGroup,
    dob: apiPatient.date_of_birth ?? apiPatient.dob,
    registeredDate: formatPatientRegisteredDate(
      apiPatient.created_at ?? apiPatient.registeredDate
    ),
    status: apiPatient.is_active === false ? 'inactive' : apiPatient.status ?? 'active',
    deptId: apiPatient.dept_id ?? apiPatient.deptId ?? apiPatient.department_id,
    doctorId: apiPatient.doctor_id ?? apiPatient.doctorId,
    state: apiPatient.state,
    aadhaar: formatAadhaarDisplay(apiPatient.aadhaar_number ?? apiPatient.aadhaar),
    allergies: apiPatient.allergies,
  };
}

export function uiToApiPatient(uiPatient) {
  if (!uiPatient) return null;
  const name = (uiPatient.name ?? '').trim();
  const spaceIdx = name.indexOf(' ');
  const first_name = spaceIdx === -1 ? name : name.slice(0, spaceIdx);
  const last_name = spaceIdx === -1 ? '' : name.slice(spaceIdx + 1).trim();

  const body = {
    first_name,
    last_name,
    gender: GENDER_TO_API[uiPatient.gender] ?? uiPatient.gender,
    phone: uiPatient.phone,
    email: uiPatient.email,
    address: uiPatient.address,
    blood_group: uiPatient.bloodGroup,
    date_of_birth: uiPatient.dob,
    state: uiPatient.state,
    aadhaar_number: (uiPatient.aadhaar ?? '').replace(/-/g, '') || undefined,
    allergies: uiPatient.allergies,
  };

  return body;
}

/** POST /opd/patient/register body (patient + visit billing fields). */
export function uiToApiPatientRegister(uiPatient) {
  const base = uiToApiPatient(uiPatient);
  const body = {
    ...base,
    department_id: Number(uiPatient.deptId ?? uiPatient.department_id),
    doctor_id: Number(uiPatient.doctorId ?? uiPatient.doctor_id),
    registration_fee: Number(
      uiPatient.registrationFee ?? uiPatient.registration_fee ?? 200
    ),
    consultation_fee: Number(
      uiPatient.consultationFee ?? uiPatient.consultation_fee ?? 800
    ),
    gst_percent: Number(uiPatient.gstPercent ?? uiPatient.gst_percent ?? 5),
  };

  const scheduledAt = uiPatient.scheduledAt ?? uiPatient.scheduled_at;
  if (scheduledAt) body.scheduled_at = scheduledAt;

  const appointmentId = uiPatient.appointmentId ?? uiPatient.appointment_id;
  if (appointmentId != null && appointmentId !== '') {
    body.appointment_id = Number(appointmentId);
  }

  return body;
}

/** POST /opd/visit body for existing patient revisit */
export function uiToApiOpdVisit(uiPatient) {
  const body = {
    patient_id: Number(uiPatient.dbId ?? uiPatient.patientDbId ?? uiPatient.patient_id),
    department_id: Number(uiPatient.deptId ?? uiPatient.department_id),
    doctor_id: Number(uiPatient.doctorId ?? uiPatient.doctor_id),
    registration_fee: Number(
      uiPatient.registrationFee ?? uiPatient.registration_fee ?? 0
    ),
    consultation_fee: Number(
      uiPatient.consultationFee ?? uiPatient.consultation_fee ?? 800
    ),
    gst_percent: Number(uiPatient.gstPercent ?? uiPatient.gst_percent ?? 5),
    waive_registration_fee: Boolean(
      uiPatient.waiveRegistrationFee ?? uiPatient.waive_registration_fee ?? true
    ),
  };

  const scheduledAt = uiPatient.scheduledAt ?? uiPatient.scheduled_at;
  if (scheduledAt) body.scheduled_at = scheduledAt;

  const appointmentId = uiPatient.appointmentId ?? uiPatient.appointment_id;
  if (appointmentId != null && appointmentId !== '') {
    body.appointment_id = Number(appointmentId);
  }

  return body;
}

export function uiToApiOpdVisitQuery(uiPatient) {
  return uiToApiPatientRegisterQuery(uiPatient);
}

export function uiToApiPatientRegisterQuery(uiPatient) {
  const paymentMode = (uiPatient.paymentMode ?? 'Cash').toLowerCase();
  const payLater = Boolean(uiPatient.payLater);
  const amount = uiPatient.amountReceived ?? uiPatient.paid;
  const paidAmount = amount != null && Number(amount) > 0 ? Number(amount) : 0;
  const transactionReference = (
    uiPatient.paymentRef ?? uiPatient.transaction_reference ?? ''
  ).trim();

  const refError = validatePaymentTransactionRef(paymentMode, transactionReference, {
    paidAmount,
    payLater,
  });
  if (refError) throw new Error(refError);

  const params = new URLSearchParams();
  params.set('payment_mode', paymentMode);
  if (paidAmount > 0) {
    params.set('amount_received', String(paidAmount));
  }
  if (payLater) params.set('pay_later', 'true');
  if (transactionReference) params.set('transaction_reference', transactionReference);
  return params.toString();
}
