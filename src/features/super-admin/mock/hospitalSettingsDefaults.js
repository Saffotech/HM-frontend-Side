/**
 * Default hospital settings mirrored from existing HMS modules (frontend constants + OPD billing).
 * Used by Super Admin Settings mock until GET/PATCH /super-admin/settings exists.
 */
import {
  APP_NAME,
  PAYMENT_MODES,
  REGISTRATION_FEE,
  REVISIT_DAYS,
  TAX_RATE,
  WARDS,
} from '@/shared/constants';

/** Matches `DEFAULT_CONSULTATION_FEE` in shared/api/services/opdReference.js */
export const DEFAULT_CONSULTATION_FEE = 800;

export const HOSPITAL_SETTINGS_PAYMENT_MODES = [...PAYMENT_MODES, 'Online'];

export function createDefaultHospitalSettings() {
  return {
    // Hospital profile
    hospital_name: 'SaffoCare General Hospital',
    address: '1200 Oak Street, Springfield, IL 62701',
    contact_email: 'admin@saffocare.local',
    contact_phone: '+91 800 123 4567',
    emergency_line: '+91 800 999 0000',
    website: 'https://saffocare.local',
    accreditation: 'NABH Accredited',
    founded_year: 1978,

    // Operations
    working_hours_weekday: '08:00 - 20:00',
    working_hours_weekend: '09:00 - 16:00',
    bed_capacity: 450,
    ward_types: WARDS.join(', '),

    // OPD & billing (BookAppointment, RegisterPatient, opd_schema defaults)
    registration_fee: REGISTRATION_FEE,
    default_consultation_fee: DEFAULT_CONSULTATION_FEE,
    gst_percent: TAX_RATE * 100,
    gst_label: 'GST',
    revisit_window_days: REVISIT_DAYS,
    waive_registration_fee_on_revisit: true,
    opd_token_prefix: 'OPD',

    // Payment modes (OpdBillPaymentFooter, CollectPaymentModal, RegisterPatient)
    payment_modes: [...HOSPITAL_SETTINGS_PAYMENT_MODES],

    // Ward daily charges (wards module — frontend preview until billing API)
    ward_rate_general: 1500,
    ward_rate_icu: 4500,
    ward_rate_private: 3500,
    ward_rate_pediatric: 2000,

    // App display
    app_display_name: APP_NAME,
    currency_code: 'INR',
    currency_symbol: '₹',
  };
}
