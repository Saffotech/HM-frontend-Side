/**
 * Super Admin → Admin edit gates for OPD + module settings cards.
 * Defaults true = Hospital Admin may edit. Stored in opd_settings.extra.admin_edit.
 */

export const ADMIN_EDIT_DEFAULTS = Object.freeze({
  // OPD
  bed_inventory: true,
  wards: true,
  all_beds: true,
  delete_controls: true,
  global_fees_tax: true,
  bed_tariff: true,
  consultation_fee_by_department: true,
  consultation_fee_by_doctor: true,
  bill_item_price_list: true,
  discount_refund: true,
  hospital_default_slots: true,
  doctor_slot_overrides: true,
  payment_modes: true,
  bank_upi_details: true,
  insurance_providers: true,
  // Doctor module
  doctor_access: true,
  doctor_clinical: true,
  doctor_profile: true,
  // Receptionist
  receptionist_access: true,
  receptionist_profile: true,
  // LAB
  lab_access: true,
  lab_results: true,
  lab_profile: true,
  // Nurse
  nurse_access: true,
  nurse_clinical: true,
  nurse_operations: true,
  // Pharmacy
  pharmacy_access: true,
  pharmacy_dispense: true,
  pharmacy_profile: true,
});

export const ADMIN_EDIT_KEYS = Object.freeze(Object.keys(ADMIN_EDIT_DEFAULTS));

export function normalizeAdminEdit(raw = {}) {
  const next = { ...ADMIN_EDIT_DEFAULTS };
  if (!raw || typeof raw !== 'object') return next;
  for (const key of ADMIN_EDIT_KEYS) {
    if (raw[key] !== undefined && raw[key] !== null) {
      next[key] = Boolean(raw[key]);
    }
  }
  return next;
}

/** Permission keys controlled by each module settings card (must match PERMISSION_GROUPS). */
export const MODULE_CARD_PERMISSION_KEYS = Object.freeze({
  doctor_access: [
    'appointments:view',
    'patients:view',
    'notifications:view',
    'notifications:update',
  ],
  doctor_clinical: [
    'appointments:update',
    'prescriptions:create',
    'prescriptions:update',
    'prescriptions:delete',
    'lab:view',
    'lab:create',
    'doctor_patient_visits:view',
    'doctor_vitals:view',
    'doctor_notes:view',
  ],
  doctor_profile: [
    'doctor_profile:view',
    'doctor_profile:update',
    'doctor_profile:upload_image',
    'doctor_profile:delete_image',
  ],
  receptionist_access: [
    'receptionist:view_queues',
    'receptionist:view_doctor_schedule',
    'notifications:view',
    'notifications:update',
  ],
  receptionist_profile: [
    'receptionist_profile:view',
    'receptionist_profile:update',
    'receptionist_profile:upload_image',
    'receptionist_profile:delete_image',
  ],
  lab_access: ['lab:view', 'notifications:view', 'notifications:update'],
  lab_results: ['lab:update', 'lab:upload_report'],
  lab_profile: [
    'lab_technician_profile:view',
    'lab_technician_profile:update',
    'lab_technician_profile:upload_image',
    'lab_technician_profile:delete_image',
  ],
  nurse_access: [
    'patients:view',
    'opd:view',
    'nurse_profile:view',
    'nurse_profile:update',
    'nurse_profile:upload_image',
    'nurse_profile:delete_image',
    'notifications:view',
    'notifications:update',
  ],
  nurse_clinical: [
    'nurse_vitals:view',
    'nurse_vitals:create',
    'nurse_vitals:update',
    'nurse_notes:view',
    'nurse_notes:create',
    'nurse_notes:update',
    'nurse_lab_reports:view',
    'nurse_medication:view',
    'nurse_medication:create',
    'nurse_medication:update',
  ],
  nurse_operations: [
    'emergency_alerts:view',
    'emergency_alerts:create',
    'emergency_alerts:update',
  ],
  pharmacy_access: [
    'prescriptions:view',
    'notifications:view',
    'notifications:update',
  ],
  pharmacy_dispense: ['prescriptions:dispense'],
  pharmacy_profile: [
    'pharmacist_profile:view',
    'pharmacist_profile:update',
    'pharmacist_profile:upload_image',
    'pharmacist_profile:delete_image',
  ],
});

export const ROLE_MODULE_LOCK_KEYS = Object.freeze({
  doctor: ['doctor_access', 'doctor_clinical', 'doctor_profile'],
  receptionist: ['receptionist_access', 'receptionist_profile'],
  lab_technician: ['lab_access', 'lab_results', 'lab_profile'],
  nurse: ['nurse_access', 'nurse_clinical', 'nurse_operations'],
  pharmacist: ['pharmacy_access', 'pharmacy_dispense', 'pharmacy_profile'],
});
