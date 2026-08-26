/**
 * Item-level pharmacy dispense calculations and validation.
 * Quantity fields from the backend take priority over client-side calculations.
 */

import { formatHumanInstructions } from '@/features/pharmacy/utils/prescriptionQuantity';
import { resolveItemQuantities } from '@/features/pharmacy/utils/prescriptionQuantities';

export function getPrescriptionItemDbId(item) {
  const raw = item?.prescription_item_id ?? item?.prescriptionItemId ?? item?.id;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

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

export function validateItemDispenseInputs(
  enrichedItems,
  quantitiesByItemId,
  amountsByItemId = {},
) {
  const rowErrors = {};
  const amountErrors = {};
  let totalNow = 0;
  let totalAmount = 0;

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

    if (qty > 0) {
      const amountRaw = amountsByItemId[item.id];
      const trimmed = String(amountRaw ?? '').trim();
      if (!trimmed) {
        amountErrors[item.id] = 'Enter amount.';
        continue;
      }
      const lineAmount = Number.parseFloat(trimmed);
      if (!Number.isFinite(lineAmount) || lineAmount < 0) {
        amountErrors[item.id] = 'Enter a valid amount ≥ 0.';
        continue;
      }
      totalAmount += Math.round(lineAmount * 100) / 100;
    }
  }

  const formError =
    totalNow === 0 ? 'Enter a dispense quantity for at least one medicine.' : '';

  const mergedRowErrors = { ...rowErrors, ...amountErrors };

  return {
    rowErrors: mergedRowErrors,
    formError,
    totalNow,
    totalAmount: Math.round(totalAmount * 100) / 100,
    valid: !formError && !Object.keys(mergedRowErrors).length,
  };
}

export function buildDispenseSummary(enrichedItems, quantitiesByItemId, amountsByItemId = {}) {
  let medicinesCount = 0;
  let totalNow = 0;
  let totalRemainingAfter = 0;
  let totalAmount = 0;

  for (const item of enrichedItems) {
    const qty = parseDispenseQuantityInput(quantitiesByItemId[item.id]) ?? 0;
    if (qty > 0) medicinesCount += 1;
    totalNow += qty;
    totalRemainingAfter += Math.max(0, item.quantity_remaining - qty);

    if (qty > 0) {
      const amountRaw = amountsByItemId[item.id];
      const lineAmount = Number.parseFloat(String(amountRaw ?? '').trim());
      if (Number.isFinite(lineAmount) && lineAmount >= 0) {
        totalAmount += Math.round(lineAmount * 100) / 100;
      }
    }
  }

  return {
    medicinesCount,
    totalNow,
    totalRemainingAfter,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

export function buildDispensePayload(
  enrichedItems,
  quantitiesByItemId,
  remarks,
  amountsByItemId = {},
) {
  const items = enrichedItems
    .map((item) => {
      const itemDbId = getPrescriptionItemDbId(item);
      const qty = parseDispenseQuantityInput(quantitiesByItemId[item.id]) ?? 0;
      if (!itemDbId || qty <= 0) return null;

      const lineAmount = Number.parseFloat(
        String(amountsByItemId[item.id] ?? '').trim(),
      );
      const amount =
        Number.isFinite(lineAmount) && lineAmount >= 0
          ? Math.round(lineAmount * 100) / 100
          : 0;
      const unit_price =
        qty > 0 ? Math.round((amount / qty) * 100) / 100 : 0;

      return {
        prescription_item_id: itemDbId,
        quantity_dispensed: qty,
        // Backend may ignore until pharmacy dispense pricing is implemented.
        amount,
        unit_price,
      };
    })
    .filter(Boolean);

  const payload = { items };
  if (remarks?.trim()) payload.remarks = remarks.trim();
  return payload;
}
