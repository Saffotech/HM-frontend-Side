import { QUICK_BILL_ITEMS } from '@/shared/constants/billing';
import { normalizeAdminEdit } from '@/features/admin/constants/adminEditLocks';

const LOCAL_STORAGE_KEY = 'hms_admin_opd_settings_v1';

export const OPD_SETTINGS_LOCAL_KEY = LOCAL_STORAGE_KEY;

export const WEEKDAY_OPTIONS = [
  { code: 'mon', label: 'Mon' },
  { code: 'tue', label: 'Tue' },
  { code: 'wed', label: 'Wed' },
  { code: 'thu', label: 'Thu' },
  { code: 'fri', label: 'Fri' },
  { code: 'sat', label: 'Sat' },
  { code: 'sun', label: 'Sun' },
];

export const DEFAULT_PAYMENT_MODES = [
  { code: 'cash', label: 'Cash', enabled: true },
  { code: 'card', label: 'Card', enabled: true },
  { code: 'upi', label: 'UPI', enabled: true },
  { code: 'insurance', label: 'Insurance', enabled: true },
];

function nextItemId(prefix = 'item') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyBillItem() {
  return {
    id: nextItemId('bill'),
    name: '',
    price: 0,
    is_active: true,
  };
}

export function createEmptyInsuranceProvider() {
  return {
    id: nextItemId('ins'),
    name: '',
    code: '',
    is_active: true,
  };
}

/** Defaults matching current hardcoded OPD behaviour. */
export function getDefaultOpdSettings() {
  return {
    admin_edit: normalizeAdminEdit(),
    delete_controls: {
      allow_patient_delete: true,
      allow_appointment_delete: true,
      allow_unpaid_bill_delete: true,
      require_admin_approval_for_delete: true,
    },
    pricing: {
      gst_percent: 5,
      registration_fee: 200,
      consultation_fee: 500,
      allow_manual_price_entry: true,
      bed_tariff: {
        general_ward_charge: 500,
        private_ward_charge: 2000,
        icu_charge: 5000,
        ward_rates: [],
        special_bed_rates: [],
      },
      department_consultation_fees: [],
      doctor_consultation_fees: [],
      bill_items: QUICK_BILL_ITEMS.map((item) => ({
        id: nextItemId('bill'),
        name: item.name,
        price: item.price,
        is_active: true,
      })),
    },
    discount_refund: {
      allow_discount: true,
      max_discount_percent: 10,
      require_admin_approval_for_discount: true,
      allow_refund: true,
      require_admin_approval_for_refund: true,
      allow_cancel_paid_bill: false,
    },
    appointment_slots: {
      start_time: '09:00',
      end_time: '16:30',
      slot_duration_minutes: 30,
      working_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
      doctor_slots: [],
    },
    payment_modes: {
      modes: DEFAULT_PAYMENT_MODES.map((mode) => ({ ...mode })),
      bank_details: {
        account_name: '',
        account_number: '',
        ifsc: '',
        bank_name: '',
        upi_id: '',
      },
      insurance_providers: [],
    },
    updated_at: null,
    _source: 'default',
  };
}

function asBool(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeBillItems(items) {
  if (!Array.isArray(items) || !items.length) {
    return getDefaultOpdSettings().pricing.bill_items;
  }
  return items.map((item) => ({
    id: item.id || nextItemId('bill'),
    name: String(item.name ?? '').trim(),
    price: asNumber(item.price, 0),
    is_active: asBool(item.is_active, true),
  }));
}

function normalizeDepartmentFees(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      department_id: Number(item.department_id),
      department_name: String(item.department_name ?? '').trim(),
      fee: item.fee === '' || item.fee == null ? '' : asNumber(item.fee, 0),
    }))
    .filter((item) => Number.isFinite(item.department_id) && item.department_id > 0);
}

function normalizeDoctorFees(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      doctor_id: Number(item.doctor_id),
      doctor_name: String(item.doctor_name ?? '').trim(),
      department_id: item.department_id == null ? null : Number(item.department_id),
      department_name: String(item.department_name ?? '').trim(),
      fee: item.fee === '' || item.fee == null ? '' : asNumber(item.fee, 0),
    }))
    .filter((item) => Number.isFinite(item.doctor_id) && item.doctor_id > 0);
}

function normalizeModes(modes) {
  const incoming = Array.isArray(modes) ? modes : [];
  return DEFAULT_PAYMENT_MODES.map((fallback) => {
    const found = incoming.find(
      (m) => String(m.code || '').toLowerCase() === fallback.code,
    );
    return {
      code: fallback.code,
      label: found?.label || fallback.label,
      enabled: asBool(found?.enabled, fallback.enabled),
    };
  });
}

function normalizeProviders(providers) {
  if (!Array.isArray(providers)) return [];
  return providers.map((p) => ({
    id: p.id || nextItemId('ins'),
    name: String(p.name ?? '').trim(),
    code: String(p.code ?? '').trim(),
    is_active: asBool(p.is_active, true),
  }));
}

function normalizeDoctorSlots(slots) {
  if (!Array.isArray(slots)) return [];
  return slots
    .filter((s) => Number.isFinite(Number(s.doctor_id)) && Number(s.doctor_id) > 0)
    .map((s) => ({
      doctor_id: Number(s.doctor_id),
      doctor_name: String(s.doctor_name ?? '').trim(),
      department_id: s.department_id == null ? null : Number(s.department_id),
      department_name: String(s.department_name ?? '').trim(),
      start_time: normalizeHhMm(s.start_time, '09:00'),
      end_time: normalizeHhMm(s.end_time, '16:30'),
      slot_duration_minutes: asNumber(s.slot_duration_minutes, 30),
      working_days: Array.isArray(s.working_days) && s.working_days.length
        ? s.working_days.map((d) => String(d).toLowerCase())
        : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
    }));
}

/** Coerce free-text / digit junk into HH:MM, else fallback. */
function normalizeHhMm(value, fallback = '09:00') {
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const h = Math.min(23, Math.max(0, Number(match[1])));
    const m = Math.min(59, Math.max(0, Number(match[2])));
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const digits = text.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    const h = Math.min(23, Number(digits.slice(0, 2)));
    const m = Math.min(59, Number(digits.slice(2).padEnd(2, '0').slice(0, 2)));
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return fallback;
}

/** Normalize API / local payload into form state. */
export function opdSettingsApiToForm(api = {}) {
  const defaults = getDefaultOpdSettings();
  const deleteControls = api.delete_controls ?? {};
  const pricing = api.pricing ?? {};
  const discount = api.discount_refund ?? {};
  const slots = api.appointment_slots ?? {};
  const payment = api.payment_modes ?? {};
  const bank = payment.bank_details ?? {};

  return {
    admin_edit: normalizeAdminEdit(api.admin_edit),
    delete_controls: {
      allow_patient_delete: asBool(
        deleteControls.allow_patient_delete,
        defaults.delete_controls.allow_patient_delete,
      ),
      allow_appointment_delete: asBool(
        deleteControls.allow_appointment_delete,
        defaults.delete_controls.allow_appointment_delete,
      ),
      allow_unpaid_bill_delete: asBool(
        deleteControls.allow_unpaid_bill_delete,
        defaults.delete_controls.allow_unpaid_bill_delete,
      ),
      require_admin_approval_for_delete: asBool(
        deleteControls.require_admin_approval_for_delete,
        defaults.delete_controls.require_admin_approval_for_delete,
      ),
    },
    pricing: {
      gst_percent: asNumber(pricing.gst_percent, defaults.pricing.gst_percent),
      registration_fee: asNumber(
        pricing.registration_fee,
        defaults.pricing.registration_fee,
      ),
      consultation_fee: asNumber(
        pricing.consultation_fee,
        defaults.pricing.consultation_fee,
      ),
      allow_manual_price_entry: asBool(
        pricing.allow_manual_price_entry,
        defaults.pricing.allow_manual_price_entry,
      ),
      bed_tariff: {
        general_ward_charge: asNumber(
          pricing.bed_tariff?.general_ward_charge,
          defaults.pricing.bed_tariff.general_ward_charge,
        ),
        private_ward_charge: asNumber(
          pricing.bed_tariff?.private_ward_charge,
          defaults.pricing.bed_tariff.private_ward_charge,
        ),
        icu_charge: asNumber(
          pricing.bed_tariff?.icu_charge,
          defaults.pricing.bed_tariff.icu_charge,
        ),
        ward_rates: Array.isArray(pricing.bed_tariff?.ward_rates)
          ? pricing.bed_tariff.ward_rates
            .filter((row) => String(row?.ward_name || '').trim())
            .map((row) => ({
              ward_name: String(row.ward_name || '').trim(),
              charge_per_day: asNumber(row.charge_per_day, 0),
            }))
          : [],
        special_bed_rates: Array.isArray(pricing.bed_tariff?.special_bed_rates)
          ? pricing.bed_tariff.special_bed_rates
            .filter((row) => String(row?.bed_number || '').trim())
            .map((row) => ({
              bed_number: String(row.bed_number || '').trim(),
              ward_name: String(row.ward_name || '').trim(),
              charge_per_day: asNumber(row.charge_per_day, 0),
            }))
          : [],
      },
      department_consultation_fees: normalizeDepartmentFees(
        pricing.department_consultation_fees,
      ),
      doctor_consultation_fees: normalizeDoctorFees(pricing.doctor_consultation_fees),
      bill_items: normalizeBillItems(pricing.bill_items),
    },
    discount_refund: {
      allow_discount: asBool(
        discount.allow_discount,
        defaults.discount_refund.allow_discount,
      ),
      max_discount_percent: asNumber(
        discount.max_discount_percent,
        defaults.discount_refund.max_discount_percent,
      ),
      require_admin_approval_for_discount: asBool(
        discount.require_admin_approval_for_discount,
        defaults.discount_refund.require_admin_approval_for_discount,
      ),
      allow_refund: asBool(
        discount.allow_refund,
        defaults.discount_refund.allow_refund,
      ),
      require_admin_approval_for_refund: asBool(
        discount.require_admin_approval_for_refund,
        defaults.discount_refund.require_admin_approval_for_refund,
      ),
      allow_cancel_paid_bill: asBool(
        discount.allow_cancel_paid_bill,
        defaults.discount_refund.allow_cancel_paid_bill,
      ),
    },
    appointment_slots: {
      start_time: normalizeHhMm(
        slots.start_time,
        defaults.appointment_slots.start_time,
      ),
      end_time: normalizeHhMm(
        slots.end_time,
        defaults.appointment_slots.end_time,
      ),
      slot_duration_minutes: asNumber(
        slots.slot_duration_minutes,
        defaults.appointment_slots.slot_duration_minutes,
      ),
      working_days: Array.isArray(slots.working_days) && slots.working_days.length
        ? slots.working_days.map((d) => String(d).toLowerCase())
        : [...defaults.appointment_slots.working_days],
      doctor_slots: normalizeDoctorSlots(slots.doctor_slots),
    },
    payment_modes: {
      modes: normalizeModes(payment.modes),
      bank_details: {
        account_name: bank.account_name ?? '',
        account_number: bank.account_number ?? '',
        ifsc: bank.ifsc ?? '',
        bank_name: bank.bank_name ?? '',
        upi_id: bank.upi_id ?? '',
      },
      insurance_providers: normalizeProviders(payment.insurance_providers),
    },
    updated_at: api.updated_at ?? null,
    _source: api._source || 'api',
  };
}

/** Strip UI-only fields before PATCH. */
export function opdSettingsFormToApi(form = {}) {
  return {
    admin_edit: normalizeAdminEdit(form.admin_edit),
    delete_controls: { ...form.delete_controls },
    pricing: {
      gst_percent: asNumber(form.pricing?.gst_percent, 0),
      registration_fee: asNumber(form.pricing?.registration_fee, 0),
      consultation_fee: asNumber(form.pricing?.consultation_fee, 0),
      allow_manual_price_entry: asBool(form.pricing?.allow_manual_price_entry, false),
      bed_tariff: {
        general_ward_charge: asNumber(form.pricing?.bed_tariff?.general_ward_charge, 0),
        private_ward_charge: asNumber(form.pricing?.bed_tariff?.private_ward_charge, 0),
        icu_charge: asNumber(form.pricing?.bed_tariff?.icu_charge, 0),
        ward_rates: (form.pricing?.bed_tariff?.ward_rates ?? [])
          .filter((row) => String(row?.ward_name || '').trim())
          .map((row) => ({
            ward_name: String(row.ward_name || '').trim(),
            charge_per_day: asNumber(row.charge_per_day, 0),
          })),
        special_bed_rates: (form.pricing?.bed_tariff?.special_bed_rates ?? [])
          .filter((row) => String(row?.bed_number || '').trim())
          .map((row) => ({
            bed_number: String(row.bed_number || '').trim(),
            ward_name: String(row.ward_name || '').trim(),
            charge_per_day: asNumber(row.charge_per_day, 0),
          })),
      },
      department_consultation_fees: (form.pricing?.department_consultation_fees ?? [])
        .filter(
          (row) =>
            Number.isFinite(Number(row.department_id)) &&
            row.fee !== '' &&
            row.fee != null &&
            Number.isFinite(Number(row.fee)),
        )
        .map((row) => ({
          department_id: Number(row.department_id),
          department_name: String(row.department_name || '').trim(),
          fee: asNumber(row.fee, 0),
        })),
      doctor_consultation_fees: (form.pricing?.doctor_consultation_fees ?? [])
        .filter(
          (row) =>
            Number.isFinite(Number(row.doctor_id)) &&
            row.fee !== '' &&
            row.fee != null &&
            Number.isFinite(Number(row.fee)),
        )
        .map((row) => ({
          doctor_id: Number(row.doctor_id),
          doctor_name: String(row.doctor_name || '').trim(),
          department_id:
            row.department_id == null || row.department_id === ''
              ? null
              : Number(row.department_id),
          department_name: String(row.department_name || '').trim(),
          fee: asNumber(row.fee, 0),
        })),
      bill_items: (form.pricing?.bill_items ?? [])
        .filter((item) => String(item.name || '').trim())
        .map((item) => ({
          id: item.id,
          name: String(item.name).trim(),
          price: asNumber(item.price, 0),
          is_active: asBool(item.is_active, true),
        })),
    },
    discount_refund: {
      allow_discount: asBool(form.discount_refund?.allow_discount, false),
      max_discount_percent: asNumber(form.discount_refund?.max_discount_percent, 0),
      require_admin_approval_for_discount: asBool(
        form.discount_refund?.require_admin_approval_for_discount,
        true,
      ),
      allow_refund: asBool(form.discount_refund?.allow_refund, false),
      require_admin_approval_for_refund: asBool(
        form.discount_refund?.require_admin_approval_for_refund,
        true,
      ),
      allow_cancel_paid_bill: asBool(
        form.discount_refund?.allow_cancel_paid_bill,
        false,
      ),
    },
    appointment_slots: {
      start_time: normalizeHhMm(form.appointment_slots?.start_time, '09:00'),
      end_time: normalizeHhMm(form.appointment_slots?.end_time, '16:30'),
      slot_duration_minutes: asNumber(
        form.appointment_slots?.slot_duration_minutes,
        30,
      ),
      working_days: Array.isArray(form.appointment_slots?.working_days)
        ? form.appointment_slots.working_days
        : [],
      doctor_slots: (form.appointment_slots?.doctor_slots ?? [])
        .filter((s) => Number.isFinite(Number(s.doctor_id)) && Number(s.doctor_id) > 0)
        .map((s) => ({
          doctor_id: Number(s.doctor_id),
          doctor_name: String(s.doctor_name || '').trim(),
          department_id: s.department_id == null ? null : Number(s.department_id),
          department_name: String(s.department_name || '').trim(),
          start_time: normalizeHhMm(s.start_time, '09:00'),
          end_time: normalizeHhMm(s.end_time, '16:30'),
          slot_duration_minutes: asNumber(s.slot_duration_minutes, 30),
          working_days: Array.isArray(s.working_days) ? s.working_days : [],
        })),
    },
    payment_modes: {
      modes: (form.payment_modes?.modes ?? []).map((mode) => ({
        code: mode.code,
        label: mode.label,
        enabled: asBool(mode.enabled, false),
      })),
      bank_details: {
        account_name: form.payment_modes?.bank_details?.account_name || '',
        account_number: form.payment_modes?.bank_details?.account_number || '',
        ifsc: form.payment_modes?.bank_details?.ifsc || '',
        bank_name: form.payment_modes?.bank_details?.bank_name || '',
        upi_id: form.payment_modes?.bank_details?.upi_id || '',
      },
      insurance_providers: (form.payment_modes?.insurance_providers ?? [])
        .filter((p) => String(p.name || '').trim())
        .map((p) => ({
          id: p.id,
          name: String(p.name).trim(),
          code: String(p.code || '').trim(),
          is_active: asBool(p.is_active, true),
        })),
    },
  };
}

export function readLocalOpdSettings() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeLocalOpdSettings(payload) {
  const toStore = {
    ...payload,
    updated_at: new Date().toISOString(),
    _source: 'local',
  };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(toStore));
  return toStore;
}

export function validateOpdSettingsForm(form) {
  const errors = [];
  const gst = Number(form.pricing?.gst_percent);
  if (!Number.isFinite(gst) || gst < 0 || gst > 100) {
    errors.push('GST percent must be between 0 and 100.');
  }
  const duration = Number(form.appointment_slots?.slot_duration_minutes);
  if (!Number.isFinite(duration) || duration < 5 || duration > 240) {
    errors.push('Slot duration must be between 5 and 240 minutes.');
  }
  const start = form.appointment_slots?.start_time;
  const end = form.appointment_slots?.end_time;
  const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRe.test(String(start || ''))) {
    errors.push('Day start must be a valid time in HH:MM format (e.g. 09:00).');
  }
  if (!timeRe.test(String(end || ''))) {
    errors.push('Day end must be a valid time in HH:MM format (e.g. 16:30).');
  }
  if (timeRe.test(String(start || '')) && timeRe.test(String(end || '')) && start >= end) {
    errors.push('Slot end time must be after start time.');
  }
  for (const slot of form.appointment_slots?.doctor_slots ?? []) {
    if (!timeRe.test(String(slot.start_time || '')) || !timeRe.test(String(slot.end_time || ''))) {
      errors.push(
        `Doctor slot times for ${slot.doctor_name || 'doctor'} must use HH:MM format.`,
      );
      break;
    }
    if (slot.start_time >= slot.end_time) {
      errors.push(
        `Doctor slot end time must be after start for ${slot.doctor_name || 'doctor'}.`,
      );
      break;
    }
  }
  const maxDiscount = Number(form.discount_refund?.max_discount_percent);
  if (!Number.isFinite(maxDiscount) || maxDiscount < 0 || maxDiscount > 100) {
    errors.push('Max discount percent must be between 0 and 100.');
  }
  const activeModes = (form.payment_modes?.modes ?? []).filter((m) => m.enabled);
  if (!activeModes.length) {
    errors.push('Enable at least one payment mode.');
  }
  return errors;
}
