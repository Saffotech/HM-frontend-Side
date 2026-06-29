/**
 * Item-level pharmacy dispense calculations and validation.
 * Quantity fields from the backend take priority over client-side calculations.
 */

import { formatHumanInstructions } from '@/features/pharmacy/utils/prescriptionQuantity';
import { resolveItemQuantities } from '@/features/pharmacy/utils/prescriptionQuantities';

export function parseDispenseQuantityInput(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return 0;
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function enrichPrescriptionItems(rx) {
  return (rx?.prescription_items ?? []).map((item) => {
    const { quantity_prescribed, quantity_dispensed, quantity_remaining } =
      resolveItemQuantities(item);
    return {
      ...item,
      quantity_prescribed,
      quantity_dispensed,
      quantity_remaining,
      instructions_label: item.instructions_label || formatHumanInstructions(item),
    };
  });
}

export function computePrescriptionStatus(enrichedItems) {
  if (!enrichedItems.length) return 'pending';
  const hasAnyDispensed = enrichedItems.some((i) => i.quantity_dispensed > 0);
  const allComplete = enrichedItems.every(
    (i) => i.quantity_remaining <= 0 && i.quantity_prescribed > 0
  );
  if (allComplete) return 'dispensed';
  if (hasAnyDispensed) return 'partially_dispensed';
  return 'pending';
}

export function validateItemDispenseInputs(enrichedItems, quantitiesByItemId) {
  const rowErrors = {};
  let totalNow = 0;

  for (const item of enrichedItems) {
    const raw = quantitiesByItemId[item.id];
    const qty = parseDispenseQuantityInput(raw);
    if (qty === null) {
      rowErrors[item.id] = 'Enter a whole number ≥ 0.';
      continue;
    }
    if (qty > item.quantity_remaining) {
      rowErrors[item.id] = `Cannot exceed remaining (${item.quantity_remaining}).`;
      continue;
    }
    totalNow += qty;
  }

  const formError =
    totalNow === 0 ? 'Enter a dispense quantity for at least one medicine.' : '';

  return { rowErrors, formError, totalNow, valid: !formError && !Object.keys(rowErrors).length };
}

export function buildDispenseSummary(enrichedItems, quantitiesByItemId) {
  let medicinesCount = 0;
  let totalNow = 0;
  let totalRemainingAfter = 0;

  for (const item of enrichedItems) {
    const qty = parseDispenseQuantityInput(quantitiesByItemId[item.id]) ?? 0;
    if (qty > 0) medicinesCount += 1;
    totalNow += qty;
    totalRemainingAfter += Math.max(0, item.quantity_remaining - qty);
  }

  return { medicinesCount, totalNow, totalRemainingAfter };
}

export function buildDispensePayload(enrichedItems, quantitiesByItemId, remarks) {
  const items = enrichedItems
    .map((item) => {
      const qty = parseDispenseQuantityInput(quantitiesByItemId[item.id]) ?? 0;
      if (qty <= 0) return null;
      return {
        prescription_item_id: item.id,
        quantity_dispensed: qty,
      };
    })
    .filter(Boolean);

  const payload = { items };
  if (remarks?.trim()) payload.remarks = remarks.trim();
  return payload;
}

export function computeDispenseEventStatus(enrichedItems, quantitiesByItemId) {
  const nextItems = enrichedItems.map((item) => {
    const now = parseDispenseQuantityInput(quantitiesByItemId[item.id]) ?? 0;
    return {
      ...item,
      quantity_dispensed: item.quantity_dispensed + now,
      quantity_remaining: Math.max(0, item.quantity_remaining - now),
    };
  });
  return computePrescriptionStatus(nextItems);
}
