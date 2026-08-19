/**
 * Self-pay / pay-and-claim IPD billing — sessionStorage until unified API exists.
 * Keyed by admissionId so billing belongs to the correct admission.
 */

import {
  calculateInsuranceChargeTotals,
  cloneDefaultChargeHeads,
  normalizeInsuranceChargeHeads,
} from '@/features/ipd/utils/insuranceChargeHeads';
import {
  sortDailyCharges,
} from '@/features/ipd/utils/insuranceDailyCharges';
import {
  mergeSelfPayChargeHeads,
  mergeSelfPayDailyCharges,
  isManualDailyChargeRow,
} from '@/features/ipd/billing/ipdBillingMapper';
import {
  normalizeDailyCharges,
} from '@/features/ipd/utils/insuranceDailyCharges';

function storageKey(admissionId) {
  return `ipd-self-pay-billing-${admissionId}`;
}

export function loadSelfPayBillingState(admissionId) {
  if (!admissionId) return null;
  try {
    const raw = sessionStorage.getItem(storageKey(admissionId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSelfPayBillingState(admissionId, patch) {
  if (!admissionId) return null;
  const current = loadSelfPayBillingState(admissionId) ?? {
    admissionId: String(admissionId),
    dailyCharges: [],
    charges: cloneDefaultChargeHeads(),
  };
  const next = {
    ...current,
    ...patch,
    admissionId: String(admissionId),
    updatedAt: new Date().toISOString(),
  };
  sessionStorage.setItem(storageKey(admissionId), JSON.stringify(next));
  return next;
}

export function updateSelfPayFinalCharges(admissionId, charges, previewItems = []) {
  const normalized = normalizeInsuranceChargeHeads(charges);
  const totals = calculateInsuranceChargeTotals(normalized);
  return saveSelfPayBillingState(admissionId, {
    charges: normalized,
    grossBill: totals.grossBeforeDiscount,
    discount: totals.discount,
    netBill: totals.netBill,
    previewSnapshot: previewItems,
  });
}

export function updateSelfPayDailyCharges(
  admissionId,
  dailyCharges,
  previewItems = [],
  admissionContext = {},
) {
  const manualOnly = normalizeDailyCharges(dailyCharges).filter(isManualDailyChargeRow);
  const normalized = sortDailyCharges(manualOnly);
  const stored = loadSelfPayBillingState(admissionId);
  const baseCharges = stored?.charges ?? cloneDefaultChargeHeads();
  const preview = { items: previewItems };
  const mergedDaily = mergeSelfPayDailyCharges(
    preview,
    { dailyCharges: normalized },
    { admissionId: String(admissionId), ...admissionContext },
  );
  const charges = mergeSelfPayChargeHeads(previewItems, mergedDaily, baseCharges);
  const totals = calculateInsuranceChargeTotals(charges);

  return saveSelfPayBillingState(admissionId, {
    dailyCharges: normalized,
    charges: normalizeInsuranceChargeHeads(charges),
    grossBill: totals.grossBeforeDiscount,
    discount: totals.discount,
    netBill: totals.netBill,
    previewSnapshot: previewItems,
  });
}
