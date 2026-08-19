/**
 * Insurance billing charge heads — default template + backend-ready shape.
 *
 * Future API fields (PUT /ipd/admissions/{id}/insurance/billing):
 *   id, charge_category, label, amount, is_default, sort_order
 */

export const CHARGE_CATEGORY = {
  ROOM: 'room',
  DOCTOR: 'doctor',
  LABORATORY: 'laboratory',
  PHARMACY: 'pharmacy',
  PROCEDURE: 'procedure',
  MISCELLANEOUS: 'miscellaneous',
  DISCOUNT: 'discount',
  CUSTOM: 'custom',
};

/** Default hospital charge template (hardcoded baseline). */
export const DEFAULT_INSURANCE_CHARGE_HEADS = [
  {
    id: 'room',
    charge_category: CHARGE_CATEGORY.ROOM,
    label: 'Room Charges',
    amount: 0,
    is_default: true,
    sort_order: 1,
  },
  {
    id: 'doctor',
    charge_category: CHARGE_CATEGORY.DOCTOR,
    label: 'Doctor Charges',
    amount: 0,
    is_default: true,
    sort_order: 2,
  },
  {
    id: 'lab',
    charge_category: CHARGE_CATEGORY.LABORATORY,
    label: 'Laboratory',
    amount: 0,
    is_default: true,
    sort_order: 3,
  },
  {
    id: 'pharmacy',
    charge_category: CHARGE_CATEGORY.PHARMACY,
    label: 'Pharmacy',
    amount: 0,
    is_default: true,
    sort_order: 4,
  },
  {
    id: 'procedure',
    charge_category: CHARGE_CATEGORY.PROCEDURE,
    label: 'Treatment',
    amount: 0,
    is_default: true,
    sort_order: 5,
  },
  {
    id: 'misc',
    charge_category: CHARGE_CATEGORY.MISCELLANEOUS,
    label: 'Miscellaneous',
    amount: 0,
    is_default: true,
    sort_order: 6,
  },
  {
    id: 'discount',
    charge_category: CHARGE_CATEGORY.DISCOUNT,
    label: 'Discount',
    amount: 0,
    is_default: true,
    sort_order: 99,
  },
];

const DEFAULT_IDS = new Set(DEFAULT_INSURANCE_CHARGE_HEADS.map((row) => row.id));

export function cloneDefaultChargeHeads() {
  return DEFAULT_INSURANCE_CHARGE_HEADS.map((row) => ({ ...row }));
}

export function isDiscountCharge(row) {
  return (
    row?.charge_category === CHARGE_CATEGORY.DISCOUNT || row?.id === 'discount'
  );
}

export function isDefaultChargeHead(row) {
  return Boolean(row?.is_default) || DEFAULT_IDS.has(row?.id);
}

export function canRemoveChargeHead(row) {
  return Boolean(row?.id);
}

/** Normalize legacy/dummy rows into a consistent API-ready shape. */
export function normalizeInsuranceChargeHeads(charges) {
  if (!Array.isArray(charges)) {
    return cloneDefaultChargeHeads();
  }
  if (charges.length === 0) {
    return [];
  }

  const normalized = charges.map((row, index) => {
    const id = String(row.id ?? `custom-${index}`);
    const template = DEFAULT_INSURANCE_CHARGE_HEADS.find((t) => t.id === id);
    const chargeCategory =
      row.charge_category ??
      template?.charge_category ??
      (id.startsWith('custom-') ? CHARGE_CATEGORY.CUSTOM : CHARGE_CATEGORY.MISCELLANEOUS);

    return {
      id,
      charge_category: chargeCategory,
      label: row.label ?? template?.label ?? 'Charge',
      amount: row.amount ?? 0,
      is_default: row.is_default ?? Boolean(template),
      sort_order: row.sort_order ?? template?.sort_order ?? 50 + index,
    };
  });

  return sortInsuranceChargeHeads(normalized);
}

export function sortInsuranceChargeHeads(charges) {
  return [...charges].sort((a, b) => {
    if (isDiscountCharge(a)) return 1;
    if (isDiscountCharge(b)) return -1;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

export function createCustomChargeHead(label, amount = 0) {
  const trimmed = String(label ?? '').trim();
  return {
    id: `custom-${Date.now()}`,
    charge_category: CHARGE_CATEGORY.CUSTOM,
    label: trimmed || 'Other Charge',
    amount,
    is_default: false,
    sort_order: 50,
  };
}

export function calculateInsuranceChargeTotals(charges) {
  const rows = normalizeInsuranceChargeHeads(charges);
  let grossBeforeDiscount = 0;
  let discount = 0;

  rows.forEach((row) => {
    const n = Number(row.amount) || 0;
    if (isDiscountCharge(row)) {
      discount += n;
    } else {
      grossBeforeDiscount += n;
    }
  });

  const netBill = Math.max(0, grossBeforeDiscount - discount);

  return {
    grossBeforeDiscount,
    discount,
    netBill,
    /** Net after discount — same label as billing UI "Gross Bill". */
    displayGross: netBill,
  };
}

/** Payload shape for future PUT insurance billing API. */
export function toInsuranceBillingChargesPayload(charges) {
  return normalizeInsuranceChargeHeads(charges).map(
    ({ id, charge_category, label, amount, is_default, sort_order }) => ({
      id,
      charge_category,
      label,
      amount: Number(amount) || 0,
      is_default,
      sort_order,
    }),
  );
}
