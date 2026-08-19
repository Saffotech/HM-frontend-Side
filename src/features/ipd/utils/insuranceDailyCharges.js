/**
 * Insurance IPD daily charge lines — one row per item (medicine, procedure, etc.).
 *
 * Future API fields:
 *   id, charge_date, head, charge_category, item_name, quantity, amount
 */

import {
  CHARGE_CATEGORY,
  DEFAULT_INSURANCE_CHARGE_HEADS,
  cloneDefaultChargeHeads,
  isDiscountCharge,
  normalizeInsuranceChargeHeads,
} from '@/features/ipd/utils/insuranceChargeHeads';

export const DAILY_CHARGE_CATEGORY_OPTIONS = DEFAULT_INSURANCE_CHARGE_HEADS.filter(
  (row) => row.charge_category !== CHARGE_CATEGORY.DISCOUNT,
).map((row) => ({
  value: row.charge_category,
  label: row.label,
}));

const CATEGORY_LABELS = Object.fromEntries(
  DAILY_CHARGE_CATEGORY_OPTIONS.map((row) => [row.value, row.label]),
);

const HEAD_TO_CATEGORY = Object.fromEntries(
  DAILY_CHARGE_CATEGORY_OPTIONS.map((row) => [row.label.toLowerCase(), row.value]),
);

export function getDailyChargeCategoryLabel(category) {
  return CATEGORY_LABELS[category] ?? 'Charge';
}

/** Placeholder hint for the item field based on charge head. */
export function getDailyChargeItemPlaceholder(head) {
  const value = String(head ?? '').trim().toLowerCase();
  if (value.includes('pharmacy') || value.includes('medicine')) {
    return 'Medicine name';
  }
  if (value.includes('procedure') || value.includes('treatment')) {
    return 'Treatment name';
  }
  if (value.includes('lab')) return 'Test name';
  if (value.includes('room')) return 'Room / bed';
  if (value.includes('doctor')) return 'Visit / doctor name';
  return 'Item name';
}

/** Column label for item field in tables. */
export function getDailyChargeItemColumnLabel(head) {
  const value = String(head ?? '').trim().toLowerCase();
  if (value.includes('pharmacy') || value.includes('medicine')) {
    return 'Medicine';
  }
  if (value.includes('procedure') || value.includes('treatment')) {
    return 'Treatment';
  }
  if (value.includes('lab')) return 'Test';
  return 'Item';
}

/** Map a typed head label to a rollup category (defaults to miscellaneous). */
export function resolveCategoryFromHead(head) {
  const trimmed = String(head ?? '').trim();
  if (!trimmed) return CHARGE_CATEGORY.MISCELLANEOUS;

  const exact = HEAD_TO_CATEGORY[trimmed.toLowerCase()];
  if (exact) return exact;

  const lower = trimmed.toLowerCase();
  if (lower.includes('procedure') || lower.includes('treatment')) {
    return CHARGE_CATEGORY.PROCEDURE;
  }

  const matched = DAILY_CHARGE_CATEGORY_OPTIONS.find((row) => {
    const label = row.label.toLowerCase();
    return lower.includes(label) || label.includes(lower);
  });
  if (matched) return matched.value;

  return CHARGE_CATEGORY.MISCELLANEOUS;
}

export function normalizeDailyCharges(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  return rows.map((row, index) => {
    const fallbackCategory =
      row.charge_category ??
      DAILY_CHARGE_CATEGORY_OPTIONS[0]?.value ??
      CHARGE_CATEGORY.ROOM;
    const head =
      String(row.head ?? '').trim() ||
      getDailyChargeCategoryLabel(fallbackCategory);
    const item_name = String(row.item_name ?? row.description ?? '').trim();
    const qtyRaw = Number(row.quantity);
    const quantity =
      Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;

    return {
      id: String(row.id ?? `daily-${index}`),
      charge_date: String(row.charge_date ?? '').slice(0, 10),
      head,
      charge_category: row.charge_category ?? resolveCategoryFromHead(head),
      item_name,
      quantity,
      amount: row.amount ?? 0,
      source: row.source ?? null,
      sourceId: row.sourceId ?? row.source_id ?? null,
      isAuto: row.isAuto === true,
    };
  });
}

export function sortDailyCharges(rows) {
  return [...normalizeDailyCharges(rows)].sort((a, b) => {
    const dateCmp = b.charge_date.localeCompare(a.charge_date);
    if (dateCmp !== 0) return dateCmp;
    return String(a.id).localeCompare(String(b.id));
  });
}

export function createDailyCharge({
  charge_date = '',
  head = 'Room Charges',
  item_name = '',
  quantity = 1,
  amount = 0,
} = {}) {
  const trimmedHead = String(head).trim() || 'Room Charges';
  const trimmedItem = String(item_name).trim();
  if (!trimmedItem) return null;

  return normalizeDailyCharges([
    {
      id: `daily-${Date.now()}`,
      charge_date,
      head: trimmedHead,
      item_name: trimmedItem,
      quantity,
      amount,
      source: 'manual',
      isAuto: false,
    },
  ])[0];
}

export function patchDailyCharge(row, patch) {
  return normalizeDailyCharges([{ ...row, ...patch }])[0];
}

export function calculateDailyChargesTotal(rows) {
  return normalizeDailyCharges(rows).reduce(
    (sum, row) => sum + (Number(row.amount) || 0),
    0,
  );
}

/** Group sorted daily lines by charge_date (newest date first). */
export function groupDailyChargesByDate(rows) {
  const sorted = sortDailyCharges(rows);
  const groups = new Map();

  sorted.forEach((row) => {
    const key = row.charge_date || 'unknown';
    const bucket = groups.get(key) ?? [];
    bucket.push(row);
    groups.set(key, bucket);
  });

  return Array.from(groups.entries()).map(([charge_date, items]) => ({
    charge_date,
    items,
    total: calculateDailyChargesTotal(items),
    categories: [...new Set(items.map((item) => item.head))],
    itemCount: items.length,
  }));
}

/** Roll daily lines into hospital charge-head totals (discount head unchanged). */
export function rollupDailyChargesToChargeHeads(dailyCharges, charges) {
  const normalized = normalizeInsuranceChargeHeads(charges);
  const sums = {};

  normalizeDailyCharges(dailyCharges).forEach((row) => {
    const category =
      row.charge_category === CHARGE_CATEGORY.CUSTOM
        ? CHARGE_CATEGORY.MISCELLANEOUS
        : row.charge_category;
    sums[category] = (sums[category] || 0) + (Number(row.amount) || 0);
  });

  return normalized.map((head) => {
    if (isDiscountCharge(head)) return { ...head };
    if (!head.is_default) return { ...head };

    const rolled = sums[head.charge_category] ?? 0;
    return {
      ...head,
      amount: rolled,
    };
  });
}

export function initDailyCharges(claim) {
  if (Array.isArray(claim?.dailyCharges) && claim.dailyCharges.length > 0) {
    return sortDailyCharges(claim.dailyCharges);
  }
  return [];
}
