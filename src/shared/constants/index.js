/** App-wide constants — mirrors backend Constants/ */

if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL?.trim()) {
  throw new Error('VITE_API_BASE_URL must be set in production builds');
}

/**
 * Dev: empty base URL + API_PREFIX `/api` → Vite proxy (see vite.config.js).
 * Set VITE_API_BASE_URL to a full URL to bypass the proxy and call the backend directly.
 * Prod: VITE_API_BASE_URL is required; no /api prefix.
 */
export const API_BASE_URL = (() => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (import.meta.env.PROD) return configured;
  if (configured) return configured;
  return '';
})();

/** `/api` prefix in dev proxy mode only — backend has no /api segment. */
export const API_PREFIX =
  !import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL?.trim() ? '/api' : '';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
};

export const APP_NAME = 'SaffoCare';
export const BRAND_NAME_LEAD = 'Saffo';
export const BRAND_NAME_TRAIL = 'Care';
export const APP_LOGO_SRC = '/saffocare-logo.png';
export const APP_LOGO_ALT = 'SaffoCare';
export const APP_ROLE = 'Billing Counter';

/** Staff roles — keep in sync with backend seed (admin, doctor, opd_billing, etc.) */
export const ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  RECEPTIONIST: 'receptionist',
  LAB_TECHNICIAN: 'lab_technician',
  PHARMACIST: 'pharmacist',
  BILLING: 'billing',
  /** OPD front desk — patients, appointments, beds, billing, payments */
  OPD: 'opd',
  NURSE: 'nurse',
};

export const REGISTRATION_FEE = 200;
export const TAX_RATE = 0.05;
export const REVISIT_DAYS = 30;

export const PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'Insurance'];

export const WARDS = ['General', 'ICU', 'Private', 'Pediatric'];

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  PATIENT_LOGIN: '/patient-login',
  /** Default page after login — OPD / admin home */
  APP_ENTRY: '/dashboard',
  /** Doctor module home (placeholder until full dashboard) */
  DOCTOR_DASHBOARD: '/doctor/dashboard',
  LAB_DASHBOARD: '/lab/dashboard',
  LAB_ORDERS: '/lab/orders',
  LAB_ORDER_UPLOAD: '/lab/orders/:id/upload',
  LAB_REPORTS: '/lab/reports',
  PHARMACY_LOGIN: '/pharmacy/login',
  PHARMACY_DASHBOARD: '/pharmacy/dashboard',
  PHARMACY_PRESCRIPTIONS: '/pharmacy/prescriptions',
  PHARMACY_PRESCRIPTION_DETAIL: '/pharmacy/prescriptions/:id',
  PHARMACY_DISPENSE: '/pharmacy/dispense/:id',
  PHARMACY_HISTORY: '/pharmacy/history',
  NURSE_DASHBOARD: '/nurse/dashboard',
  NURSE_QUEUE: '/nurse/queue',
  NURSE_PATIENT: '/nurse/patients/:patientId',
  NURSE_PATIENT_VITALS: '/nurse/patients/:patientId/vitals',
  NURSE_PATIENT_NOTES: '/nurse/patients/:patientId/notes',
  NURSE_VITALS: '/nurse/vitals',
  NURSE_VITALS_NEW: '/nurse/vitals/new',
  NURSE_VITAL_DETAIL: '/nurse/vitals/:vitalId',
  NURSE_VITAL_EDIT: '/nurse/vitals/:vitalId/edit',
  NURSE_NOTES: '/nurse/notes',
  NURSE_NOTES_NEW: '/nurse/notes/new',
  NURSE_NOTE_DETAIL: '/nurse/notes/:noteId',
  NURSE_NOTE_EDIT: '/nurse/notes/:noteId/edit',
  NURSE_MEDICATIONS: '/nurse/medications',
  NURSE_MEDICATIONS_PATIENT: '/nurse/medications/patient/:patientId',
  NURSE_MEDICATIONS_HISTORY: '/nurse/medications/history',
  NURSE_MEDICATIONS_PATIENT_HISTORY: '/nurse/medications/history/:patientId',
  NURSE_HANDOVER: '/nurse/handover',
  NURSE_HANDOVER_NEW: '/nurse/handover/new',
  NURSE_HANDOVER_DETAIL: '/nurse/handover/:id',
  NURSE_HANDOVER_EDIT: '/nurse/handover/:id/edit',
  NURSE_ALERTS: '/nurse/alerts',
  NURSE_ALERTS_NEW: '/nurse/alerts/new',
  NURSE_ALERT_DETAIL: '/nurse/alerts/:alertId',
  NURSE_PROFILE: '/nurse/profile',
  ADMIN_LOGIN: '/admin/login',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_STAFF: '/admin/staff',
  ADMIN_STAFF_NEW: '/admin/staff/new',
  ADMIN_STAFF_DETAIL: '/admin/staff/:id',
  ADMIN_ROLES: '/admin/roles',
  DASHBOARD: '/dashboard',
  BILLING: '/billing',
  BILLING_OPD_NEW: '/billing/opd/new',
  BILLING_VIEW: '/billing/:id',
  APPOINTMENTS: '/appointments',
  APPOINTMENTS_BOOK: '/appointments/book',
  APPOINTMENTS_AVAILABILITY: '/appointments/availability',
  PATIENTS: '/patients',
  PATIENTS_REGISTER: '/patients/register',
  PATIENT_PROFILE: '/patients/:id/profile',
  PATIENT_UPDATE: '/patients/:id/update',
  BEDS: '/beds',
  BEDS_WARD: '/beds/ward/:wardName',
  PAYMENT_HISTORY: '/payment-history',
  UNAUTHORIZED: '/unauthorized',
};

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const GENDERS = ['Male', 'Female', 'Other'];
