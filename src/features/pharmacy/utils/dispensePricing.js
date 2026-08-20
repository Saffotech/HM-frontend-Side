/**
 * Pharmacy dispense pricing — local sessionStorage until backend exposes price fields.
 * Pushes dispensed medicine lines into IPD billing daily charges (pharmacy category).
 */

import { BILLING_SOURCE } from '@/features/ipd/billing/ipdBillingConstants';
import { CHARGE_CATEGORY } from '@/features/ipd/utils/insuranceChargeHeads';
import { sortDailyCharges } from '@/features/ipd/utils/insuranceDailyCharges';

const PRESCRIPTION_PRICING_PREFIX = 'pharmacy-dispense-pricing:';
const ADMISSION_PHARMACY_PREFIX = 'ipd-pharmacy-admission:';
const PATIENT_PHARMACY_PREFIX = 'ipd-pharmacy-patient:';

function readJson(key, fallback) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  sessionStorage.setItem(key, JSON.stringify(value));
}

export function formatPharmacyMoney(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function parseDispenseAmountInput(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return null;
  const value = Number.parseFloat(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

export function calculateUnitPriceFromLineAmount(amount, quantity) {
  const qty = Number(quantity) || 0;
  const lineAmount = Number(amount) || 0;
  if (qty <= 0 || lineAmount < 0) return 0;
  return Math.round((lineAmount / qty) * 100) / 100;
}

export function parseDispensePriceInput(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return null;
  const value = Number.parseFloat(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

export function calculateDispenseLineAmount(unitPrice, quantity) {
  const qty = Number(quantity) || 0;
  const rate = Number(unitPrice) || 0;
  if (qty <= 0 || rate < 0) return 0;
  return Math.round(rate * qty * 100) / 100;
}

function pricingStorageKey(prescriptionId) {
  return `${PRESCRIPTION_PRICING_PREFIX}${prescriptionId}`;
}

function admissionStorageKey(admissionId) {
  return `${ADMISSION_PHARMACY_PREFIX}${admissionId}`;
}

function patientStorageKey(patientId) {
  return `${PATIENT_PHARMACY_PREFIX}${patientId}`;
}

/** Resolve IPD admission id from insurance admit session context. */
export function resolveAdmissionIdForPharmacyPatient(patientId, patientUid) {
  const keys = [String(patientId ?? ''), String(patientUid ?? '')].filter(Boolean);
  if (keys.length === 0) return null;

  try {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (!key?.startsWith('ipd-ins-admit-ctx:')) continue;
      const routeId = key.slice('ipd-ins-admit-ctx:'.length);
      if (!keys.includes(routeId)) continue;
      const ctx = readJson(key, null);
      const admissionId = ctx?.admission?.id ?? ctx?.claim?.admissionId;
      if (admissionId != null) return String(admissionId);
      const claimId = String(ctx?.claim?.id ?? '');
      if (claimId.startsWith('NEW-')) return claimId.slice(4);
    }
  } catch {
    // ignore
  }

  return null;
}

export function loadPrescriptionDispensePricing(prescriptionId) {
  if (!prescriptionId) return [];
  return readJson(pricingStorageKey(prescriptionId), []);
}

export function savePrescriptionDispensePricing(prescriptionId, entry) {
  if (!prescriptionId || !entry) return;
  const current = loadPrescriptionDispensePricing(prescriptionId);
  writeJson(pricingStorageKey(prescriptionId), [...current, entry]);
}

function buildPharmacyDailyChargeRow({
  id,
  medicineName,
  quantity,
  amount,
  unitPrice,
  chargeDate,
  sourceId,
}) {
  return {
    id,
    charge_date: chargeDate,
    head: 'Pharmacy',
    charge_category: CHARGE_CATEGORY.PHARMACY,
    item_name: medicineName,
    quantity: Number(quantity) || 1,
    amount: Number(amount) || 0,
    unit_price: Number(unitPrice) || 0,
    source: BILLING_SOURCE.PHARMACY,
    sourceId: sourceId ?? null,
    isAuto: true,
  };
}

function appendPharmacyChargeRows(storageKey, rows) {
  if (!storageKey || !rows?.length) return;
  const current = readJson(storageKey, []);
  const existingIds = new Set(current.map((row) => String(row.id)));
  const next = [...current];
  rows.forEach((row) => {
    if (!existingIds.has(String(row.id))) {
      next.push(row);
      existingIds.add(String(row.id));
    }
  });
  writeJson(storageKey, next);
}

/**
 * Persist dispense pricing and push pharmacy lines to IPD billing storage.
 * @param {{ prescriptionId, patientId, patientUid, admissionId, dispensedAt, items }} payload
 */
export function recordPharmacyDispenseWithPricing({
  prescriptionId,
  patientId,
  patientUid,
  admissionId,
  dispensedAt,
  items,
}) {
  if (!prescriptionId || !items?.length) return;

  const chargeDate = String(dispensedAt ?? new Date().toISOString()).slice(0, 10);
  const resolvedAdmissionId =
    admissionId ?? resolveAdmissionIdForPharmacyPatient(patientId, patientUid);
  const billingRows = [];

  items.forEach((item, index) => {
    const qty = Number(item.quantity) || 0;
    const amount =
      Number(item.amount) >= 0 && item.amount != null
        ? Math.round(Number(item.amount) * 100) / 100
        : calculateDispenseLineAmount(item.unitPrice, qty);
    const unitPrice =
      Number(item.unitPrice) >= 0 && item.unitPrice != null
        ? Math.round(Number(item.unitPrice) * 100) / 100
        : calculateUnitPriceFromLineAmount(amount, qty);
    if (qty <= 0) return;

    const recordId = `pharm-disp-${prescriptionId}-${item.prescriptionItemId}-${Date.now()}-${index}`;

    savePrescriptionDispensePricing(prescriptionId, {
      id: recordId,
      prescriptionItemId: item.prescriptionItemId,
      medicineName: item.medicineName,
      quantity: qty,
      unitPrice,
      amount,
      dispensedAt: dispensedAt ?? new Date().toISOString(),
    });

    billingRows.push(
      buildPharmacyDailyChargeRow({
        id: recordId,
        medicineName: item.medicineName,
        quantity: qty,
        amount,
        unitPrice,
        chargeDate,
        sourceId: item.prescriptionItemId,
      }),
    );
  });

  if (resolvedAdmissionId) {
    appendPharmacyChargeRows(admissionStorageKey(resolvedAdmissionId), billingRows);
  }

  const patientKey = patientId ?? patientUid;
  if (patientKey) {
    appendPharmacyChargeRows(patientStorageKey(patientKey), billingRows);
  }
}

export function loadPharmacyBillingCharges({ admissionId, patientId, patientUid }) {
  const rows = [];
  const seen = new Set();

  const pushRows = (list) => {
    (list ?? []).forEach((row) => {
      const id = String(row.id ?? '');
      if (!id || seen.has(id)) return;
      seen.add(id);
      rows.push(row);
    });
  };

  if (admissionId) {
    pushRows(readJson(admissionStorageKey(admissionId), []));
  }

  const patientKeys = [patientId, patientUid].filter(Boolean).map(String);
  patientKeys.forEach((key) => {
    pushRows(readJson(patientStorageKey(key), []));
  });

  return sortDailyCharges(rows);
}

/** Merge pharmacy dispense rows into existing daily billing lines. */
export function mergePharmacyDispenseIntoDailyCharges(dailyCharges, context = {}) {
  const pharmacyRows = loadPharmacyBillingCharges(context);
  if (!pharmacyRows.length) return dailyCharges ?? [];

  const existingIds = new Set((dailyCharges ?? []).map((row) => String(row.id)));
  const newRows = pharmacyRows.filter((row) => !existingIds.has(String(row.id)));
  if (!newRows.length) return dailyCharges ?? [];

  return sortDailyCharges([...(dailyCharges ?? []), ...newRows]);
}

export function getPrescriptionItemPricingSummary(prescriptionId, prescriptionItemId) {
  const records = loadPrescriptionDispensePricing(prescriptionId).filter(
    (row) => Number(row.prescriptionItemId) === Number(prescriptionItemId),
  );
  if (!records.length) return null;

  const totalQty = records.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  const totalAmount = records.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const unitPrices = records.map((row) => Number(row.unitPrice) || 0).filter((v) => v > 0);
  const avgUnitPrice =
    unitPrices.length > 0
      ? unitPrices.reduce((a, b) => a + b, 0) / unitPrices.length
      : totalQty > 0
        ? totalAmount / totalQty
        : 0;

  return {
    totalQty,
    totalAmount,
    unitPrice: Math.round(avgUnitPrice * 100) / 100,
    records,
  };
}

export function matchDispenseHistoryPricing(
  prescriptionId,
  { prescription_item_id, prescriptionItemId, quantity, dispensed_at, dispensedAt },
) {
  const records = loadPrescriptionDispensePricing(prescriptionId);
  const qty = Number(quantity) || 0;
  const itemId = Number(prescription_item_id ?? prescriptionItemId);
  const dateKey = String(dispensed_at ?? dispensedAt ?? '').slice(0, 16);

  const exact = records.find((row) => {
    if (Number(row.prescriptionItemId) !== itemId) return false;
    if (Number(row.quantity) !== qty) return false;
    return String(row.dispensedAt ?? '').slice(0, 16) === dateKey;
  });
  if (exact) return exact;

  return records.find(
    (row) =>
      Number(row.prescriptionItemId) === itemId &&
      Number(row.quantity) === qty,
  );
}
