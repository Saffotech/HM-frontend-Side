/**
 * Pharmacy API ↔ UI shapes (live HTTP).
 * Backend quantity fields are preferred over client-side calculations.
 */

import { formatHumanInstructions } from '@/features/pharmacy/utils/prescriptionQuantity';
import {
  resolveItemQuantities,
} from '@/features/pharmacy/utils/prescriptionQuantities';

/**
 * Display patient identifier for pharmacy UI.
 * Backend currently returns numeric patient_id only — never show internal id; use UHID when present.
 */
export function formatPharmacyPatientIdDisplay(row) {
  const uid = row?.patient_uid;
  if (uid && String(uid).trim()) return String(uid).trim();
  return '—';
}

/** @param {string | null | undefined} allergies */
function normalizeAllergies(allergies) {
  if (allergies == null || allergies === '') return null;
  return allergies;
}

/**
 * @param {Record<string, unknown>} row
 */
export function apiToUiPharmacyListItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    patient_id: row.patient_id,
    patient_uid: row.patient_uid ?? null,
    patient_name: row.patient_name ?? '',
    patient_allergies: normalizeAllergies(row.patient_allergies ?? row.allergies),
    doctor_name: row.doctor_name ?? '',
    diagnosis: row.diagnosis ?? '',
    status: row.status ?? 'pending',
    created_at: row.created_at,
  };
}

/**
 * @param {Record<string, unknown>} item
 */
export function apiToUiPharmacyPrescriptionItem(item) {
  if (!item) return null;
  const duration = Number(item.duration) || 0;
  const mapped = {
    id: item.id,
    medicine_name: item.medicine_name ?? '',
    dosage: item.dosage ?? '',
    instructions: item.instructions ?? null,
    frequency: item.frequency ?? null,
    duration,
  };

  const { quantity_prescribed, quantity_dispensed, quantity_remaining } =
    resolveItemQuantities(item);

  return {
    ...mapped,
    quantity: quantity_prescribed,
    quantity_prescribed,
    quantity_dispensed,
    quantity_remaining,
    instructions_label: formatHumanInstructions(mapped),
  };
}

/**
 * @param {Record<string, unknown>} raw
 */
export function apiToUiPharmacyPrescriptionDetail(raw) {
  if (!raw) return null;

  const doctorName = raw.doctor_name ?? '';
  const diagnosis = raw.diagnosis ?? '';
  const allergies = normalizeAllergies(raw.allergies);
  const patientName = raw.patient_name ?? '';

  const prescriptionItems = (raw.items ?? raw.prescription_items ?? [])
    .map(apiToUiPharmacyPrescriptionItem)
    .filter(Boolean);

  return {
    id: raw.id,
    patient_id: raw.patient_id,
    patient_uid: raw.patient_uid ?? null,
    patient_name: patientName,
    patient_allergies: allergies,
    doctor_name: doctorName,
    diagnosis,
    notes: raw.notes ?? null,
    status: raw.status ?? 'pending',
    created_at: raw.created_at,
    patient_phone: raw.patient_phone ?? null,
    patient: {
      name: patientName,
      allergies,
      phone: raw.patient_phone ?? null,
      dob: raw.patient_dob ?? null,
    },
    doctor: doctorName ? { first_name: doctorName } : null,
    doctors: doctorName ? [{ id: 'primary', name: doctorName, department: null }] : [],
    diagnoses: diagnosis ? [{ id: 'primary', label: diagnosis, noted_at: null }] : [],
    prescription_items: prescriptionItems,
    dispensings: raw.dispensings ?? [],
  };
}

/**
 * @param {Record<string, unknown>} raw
 * @param {{ page?: number, per_page?: number }} [pagination]
 */
export function mapPharmacyPrescriptionList(raw, { page = 1, per_page = 20 } = {}) {
  const allRows = (raw?.prescriptions ?? [])
    .map(apiToUiPharmacyListItem)
    .filter(Boolean);
  const total = raw?.total ?? allRows.length;
  const safePage = Math.max(1, page);
  const safePerPage = Math.max(1, per_page);
  const start = (safePage - 1) * safePerPage;
  const data = allRows.slice(start, start + safePerPage);

  return {
    data,
    page: safePage,
    per_page: safePerPage,
    total,
  };
}

/**
 * Map GET /pharmacy/history to rows for DispenseHistoryPage.
 * @param {Record<string, unknown>} raw
 */
export function mapDispenseHistory(raw) {
  const rows = raw?.history ?? [];
  return rows.map((row) => {
    const medicineName = row.medicine_name ?? '';
    const qty = row.quantity_dispensed ?? 0;
    return {
      id: row.id,
      dispensing_id: row.dispensing_id,
      prescription_id: row.prescription_id,
      prescription_item_id: row.prescription_item_id,
      patient_uid: row.patient_uid ?? null,
      patient_name: row.patient_name ?? '',
      medicines_summary: medicineName ? `${medicineName} ×${qty}` : '—',
      medicine_name: medicineName,
      pharmacist_name: row.pharmacist_name ?? '',
      quantity_dispensed: qty,
      status: row.status ?? 'dispensed',
      dispensed_at: row.dispensed_at,
    };
  });
}
