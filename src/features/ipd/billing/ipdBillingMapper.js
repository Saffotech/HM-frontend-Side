/**
 * Maps backend / live-preview billing payloads to the canonical frontend model
 * and to existing insurance UI shapes (daily rows, charge heads).
 */

import { BILLING_SOURCE } from '@/features/ipd/billing/ipdBillingConstants';
import { normalizeBillingTransaction } from '@/features/ipd/billing/ipdBillingModel';
import {
  calculateInsuranceChargeTotals,
  cloneDefaultChargeHeads,
  isDiscountCharge,
  normalizeInsuranceChargeHeads,
  sortInsuranceChargeHeads,
  CHARGE_CATEGORY,
} from '@/features/ipd/utils/insuranceChargeHeads';
import {
  initDailyCharges,
  normalizeDailyCharges,
  resolveCategoryFromHead,
  sortDailyCharges,
  rollupDailyChargesToChargeHeads,
} from '@/features/ipd/utils/insuranceDailyCharges';

/** Live self-pay preview item_type → billing source (existing backend contract). */
const PREVIEW_ITEM_TYPE_TO_SOURCE = {
  bed: BILLING_SOURCE.ROOM,
  visit: BILLING_SOURCE.DOCTOR,
};

/**
 * Resolve IPD admission id from insurance billing context.
 * Billing must belong to admission, not patient id alone.
 */
export function resolveAdmissionIdFromBillingContext({
  patient,
  claim,
  insuranceAdmit,
} = {}) {
  if (insuranceAdmit?.admission?.id != null) {
    return String(insuranceAdmit.admission.id);
  }
  if (claim?.admissionId != null) {
    return String(claim.admissionId);
  }
  const claimId = String(claim?.id ?? '');
  if (claimId.startsWith('NEW-')) {
    return claimId.slice(4);
  }
  if (claim?.ipdId && /^\d+$/.test(String(claim.ipdId))) {
    return String(claim.ipdId);
  }
  return patient?.admissionId != null ? String(patient.admissionId) : null;
}

export function initChargeHeadsFromClaim(claim) {
  if (Array.isArray(claim?.charges)) {
    return sortInsuranceChargeHeads(normalizeInsuranceChargeHeads(claim.charges));
  }
  return cloneDefaultChargeHeads();
}

export function buildFinalBillingSummary(chargeHeads) {
  const normalized = normalizeInsuranceChargeHeads(chargeHeads);
  const totals = calculateInsuranceChargeTotals(normalized);
  return {
    chargeHeads: normalized,
    grossBeforeDiscount: totals.grossBeforeDiscount,
    discount: totals.discount,
    netBill: totals.netBill,
    displayGross: totals.displayGross,
  };
}

/** Canonical transaction → existing daily-charge UI row. */
export function mapTransactionToDailyChargeRow(transaction) {
  const [row] = normalizeDailyCharges([
    {
      id: transaction.id,
      charge_date: transaction.chargeDate,
      head: transaction.head ?? categoryLabelFromSource(transaction.source),
      charge_category: transaction.category,
      item_name: transaction.particulars,
      quantity: transaction.quantity,
      amount: transaction.amount,
    },
  ]);
  return row;
}

/** Existing daily-charge UI row → canonical transaction. */
export function mapDailyChargeRowToTransaction(row, context = {}) {
  const head = String(row.head ?? '').trim();
  const explicitSource = row.source;
  const source =
    explicitSource && Object.values(BILLING_SOURCE).includes(explicitSource)
      ? explicitSource
      : BILLING_SOURCE.MANUAL;

  return normalizeBillingTransaction(
    {
      id: row.id,
      admissionId: context.admissionId,
      patientId: context.patientId,
      chargeDate: row.charge_date,
      category: row.charge_category ?? resolveCategoryFromHead(head),
      particulars: row.item_name,
      quantity: row.quantity,
      amount: row.amount,
      source,
      sourceId: row.sourceId ?? row.source_id ?? null,
      head,
    },
    context,
  );
}

/** Live `/ipd/billing/preview` line item → canonical transaction. */
export function mapBillPreviewItemToTransaction(item, context = {}) {
  const source =
    PREVIEW_ITEM_TYPE_TO_SOURCE[item.item_type] ?? BILLING_SOURCE.MANUAL;

  return normalizeBillingTransaction(
    {
      id: item.id,
      admissionId: context.admissionId ?? item.admission_id,
      patientId: context.patientId,
      chargeDate: context.chargeDate,
      category: source,
      particulars: item.description,
      quantity: item.qty,
      rate: item.unit_price,
      amount: item.amount,
      source,
      sourceId: item.id,
    },
    context,
  );
}

export function mapBillPreviewToTransactions(preview, context = {}) {
  const admissionId =
    context.admissionId ?? preview?.admission_id ?? preview?.admissionId;
  const items = preview?.items ?? [];
  return items.map((item) =>
    mapBillPreviewItemToTransaction(item, {
      ...context,
      admissionId,
    }),
  );
}

/** Build insurance billing bundle from resolved patient + claim. */
export function buildInsuranceBillingBundle({
  patient,
  claim,
  insuranceAdmit,
  dataSource = 'api',
}) {
  const admissionId = resolveAdmissionIdFromBillingContext({
    patient,
    claim,
    insuranceAdmit,
  });
  const patientId = patient?.id ?? null;
  const claimId = claim?.id ?? null;
  const dailyCharges = initDailyCharges(claim);
  const baseChargeHeads = initChargeHeadsFromClaim(claim);
  const rolledChargeHeads = rollupDailyChargesToChargeHeads(dailyCharges, baseChargeHeads);
  const chargeHeads = rolledChargeHeads.map((head) => {
    if (isDiscountCharge(head)) return head;
    const baseHead = baseChargeHeads.find((row) => row.id === head.id);
    const rolledAmount = Number(head.amount) || 0;
    const baseAmount = Number(baseHead?.amount) || 0;
    return {
      ...head,
      amount: rolledAmount > 0 ? rolledAmount : baseAmount,
    };
  });
  const txContext = { admissionId, patientId };
  const transactions = dailyCharges.map((row) =>
    mapDailyChargeRowToTransaction(row, txContext),
  );

  return {
    patient,
    claim,
    admissionId,
    patientId,
    claimId,
    transactions,
    dailyCharges,
    finalBilling: buildFinalBillingSummary(chargeHeads),
    dataSource,
  };
}

/** Seed room/doctor heads from live bill preview (bed + visit lines). */
export function applyPreviewItemsToChargeHeads(previewItems, charges) {
  const normalized = normalizeInsuranceChargeHeads(charges);
  const sums = {
    [CHARGE_CATEGORY.ROOM]: 0,
    [CHARGE_CATEGORY.DOCTOR]: 0,
    [CHARGE_CATEGORY.MISCELLANEOUS]: 0,
  };

  (previewItems ?? []).forEach((item) => {
    const amount = Number(item.amount) || 0;
    if (item.item_type === 'bed') {
      sums[CHARGE_CATEGORY.ROOM] += amount;
    } else if (item.item_type === 'visit') {
      sums[CHARGE_CATEGORY.DOCTOR] += amount;
    } else if (amount > 0) {
      sums[CHARGE_CATEGORY.MISCELLANEOUS] += amount;
    }
  });

  return normalized.map((head) => {
    if (isDiscountCharge(head) || !head.is_default) return { ...head };
    const seeded = sums[head.charge_category] ?? 0;
    if (seeded > 0) return { ...head, amount: seeded };
    return { ...head };
  });
}

/**
 * Merge auto preview charges with daily rollup — daily lines override per category
 * when present; otherwise keep preview-seeded amounts.
 */
export function mergeSelfPayChargeHeads(previewItems, dailyCharges, charges) {
  const normalized = normalizeInsuranceChargeHeads(charges);
  const withPreview = applyPreviewItemsToChargeHeads(previewItems, normalized);
  const dailySums = {};

  normalizeDailyCharges(dailyCharges).forEach((row) => {
    const category =
      row.charge_category === CHARGE_CATEGORY.CUSTOM
        ? CHARGE_CATEGORY.MISCELLANEOUS
        : row.charge_category;
    dailySums[category] = (dailySums[category] || 0) + (Number(row.amount) || 0);
  });

  return withPreview.map((head) => {
    if (isDiscountCharge(head)) return { ...head };
    if (!head.is_default) return { ...head };
    const rolled = dailySums[head.charge_category];
    if (rolled != null && rolled > 0) {
      return { ...head, amount: rolled };
    }
    return head;
  });
}

export function initSelfPayChargeHeads(preview, storedState, dailyChargesOverride, context = {}) {
  const storedCharges = storedState?.charges;
  const base = Array.isArray(storedCharges)
    ? sortInsuranceChargeHeads(normalizeInsuranceChargeHeads(storedCharges))
    : cloneDefaultChargeHeads();
  const dailyCharges =
    dailyChargesOverride ??
    mergeSelfPayDailyCharges(preview, storedState, context);
  return sortInsuranceChargeHeads(
    mergeSelfPayChargeHeads(preview?.items ?? [], dailyCharges, base),
  );
}

function previewItemToDailyHead(item) {
  if (item.item_type === 'bed') return 'Room Charges';
  if (item.item_type === 'visit') return 'Doctor Charges';
  return 'Miscellaneous';
}

function previewItemToDailySource(item) {
  if (item.item_type === 'bed') return BILLING_SOURCE.ROOM;
  if (item.item_type === 'visit') return BILLING_SOURCE.DOCTOR;
  return BILLING_SOURCE.MANUAL;
}

/** One ISO date per day of stay — day 1 = admission date. */
export function buildAdmissionStayDates(admittedAt, lengthOfStayDays) {
  const count = Math.max(1, Number(lengthOfStayDays) || 1);
  const dates = [];

  if (admittedAt) {
    const start = new Date(admittedAt);
    if (!Number.isNaN(start.getTime())) {
      start.setHours(12, 0, 0, 0);
      for (let i = 0; i < count; i += 1) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        dates.push(day.toISOString().slice(0, 10));
      }
      return dates;
    }
  }

  const end = new Date();
  end.setHours(12, 0, 0, 0);
  for (let i = count - 1; i >= 0; i -= 1) {
    const day = new Date(end);
    day.setDate(end.getDate() - i);
    dates.push(day.toISOString().slice(0, 10));
  }
  return dates;
}

function expandBedPreviewItemToDailyRows(item, preview, context) {
  const days = Math.max(
    1,
    Number(item.qty) || Number(preview?.length_of_stay_days) || 1,
  );
  const unitPrice =
    Number(item.unit_price) ||
    (days > 0 ? Number(item.amount) / days : 0) ||
    Number(preview?.bed_rate) ||
    0;
  const amount = Math.round(unitPrice * 100) / 100;
  const itemName = String(item.description ?? '').trim() || 'Bed charge';
  const dates = buildAdmissionStayDates(
    context.admittedAt ?? preview?.admitted_at,
    days,
  );

  return dates.map((charge_date) => ({
    id: `auto-preview-bed-${context.admissionId ?? 'na'}-${charge_date}`,
    charge_date,
    head: 'Room Charges',
    charge_category: CHARGE_CATEGORY.ROOM,
    item_name: itemName,
    quantity: 1,
    amount,
    source: BILLING_SOURCE.ROOM,
    sourceId: item.id ?? null,
    isAuto: true,
  }));
}

function mapVisitPreviewItemToDailyRow(item, visit, context, index) {
  const head = previewItemToDailyHead(item);
  const chargeDate =
    String(visit?.visited_at ?? '').slice(0, 10) ||
    context.chargeDate ||
    new Date().toISOString().slice(0, 10);

  return {
    id: item.id
      ? `auto-preview-${item.id}`
      : `auto-preview-visit-${index}`,
    charge_date: chargeDate,
    head,
    charge_category: resolveCategoryFromHead(head),
    item_name: String(item.description ?? '').trim() || 'Doctor visit',
    quantity: 1,
    amount: item.amount ?? 0,
    source: previewItemToDailySource(item),
    sourceId: item.id ?? visit?.id ?? null,
    isAuto: true,
  };
}

function mapGenericPreviewItemToDailyRow(item, context, index) {
  const head = previewItemToDailyHead(item);
  const chargeDate =
    context.chargeDate ?? new Date().toISOString().slice(0, 10);

  return {
    id: item.id
      ? `auto-preview-${item.id}`
      : `auto-preview-${item.item_type ?? 'item'}-${index}`,
    charge_date: chargeDate,
    head,
    charge_category: resolveCategoryFromHead(head),
    item_name: String(item.description ?? '').trim() || 'Charge',
    quantity: item.qty ?? 1,
    amount: item.amount ?? 0,
    source: previewItemToDailySource(item),
    sourceId: item.id ?? null,
    isAuto: true,
  };
}

/** System-generated daily lines — one bed row per stay day (qty 1 each). */
export function mapPreviewItemsToDailyCharges(preview, context = {}) {
  const items = (preview?.items ?? []).filter(
    (item) => (Number(item.amount) || 0) > 0,
  );
  let visitIndex = 0;
  const rows = [];

  items.forEach((item, index) => {
    if (item.item_type === 'bed') {
      rows.push(...expandBedPreviewItemToDailyRows(item, preview, context));
      return;
    }
    if (item.item_type === 'visit') {
      const visit = context.doctorVisits?.[visitIndex];
      visitIndex += 1;
      rows.push(mapVisitPreviewItemToDailyRow(item, visit, context, index));
      return;
    }
    rows.push(mapGenericPreviewItemToDailyRow(item, context, index));
  });

  return normalizeDailyCharges(rows);
}

export function isManualDailyChargeRow(row) {
  if (row?.isAuto === true) return false;
  if (String(row.id ?? '').startsWith('auto-preview-')) return false;
  if (row?.source && row.source !== BILLING_SOURCE.MANUAL) return false;
  return true;
}

/** Auto module lines + manually saved daily entries. */
export function mergeSelfPayDailyCharges(preview, storedState, context = {}) {
  const autoDaily = mapPreviewItemsToDailyCharges(preview, context);
  const storedManual = initDailyCharges({
    dailyCharges: (storedState?.dailyCharges ?? []).filter(isManualDailyChargeRow),
  });

  if (storedManual.length === 0) {
    return sortDailyCharges(autoDaily);
  }

  const manualRoomDates = new Set(
    storedManual
      .filter((row) => row.charge_category === CHARGE_CATEGORY.ROOM)
      .map((row) => row.charge_date),
  );
  const autoWithoutManualRoomDates = autoDaily.filter((row) => {
    if (row.charge_category !== CHARGE_CATEGORY.ROOM) return true;
    return !manualRoomDates.has(row.charge_date);
  });

  const manualNonRoom = storedManual.filter(
    (row) => row.charge_category !== CHARGE_CATEGORY.ROOM,
  );
  const manualRoom = storedManual.filter(
    (row) => row.charge_category === CHARGE_CATEGORY.ROOM,
  );

  return sortDailyCharges([
    ...autoWithoutManualRoomDates,
    ...manualRoom,
    ...manualNonRoom,
  ]);
}

/** Build self-pay bundle from live bill preview + local billing state. */
export function buildSelfPayBillingBundle(preview, context = {}, storedState = null) {
  const admissionId = String(
    context.admissionId ?? preview?.admission_id ?? '',
  );
  const dailyCharges = mergeSelfPayDailyCharges(preview, storedState, context);
  const chargeHeads = initSelfPayChargeHeads(
    preview,
    storedState,
    dailyCharges,
    context,
  );
  const txContext = {
    admissionId,
    patientId: context.patientId ?? null,
  };
  const autoTransactions = mapBillPreviewToTransactions(preview, txContext);
  const manualTransactions = dailyCharges.map((row) =>
    mapDailyChargeRowToTransaction(row, txContext),
  );

  return {
    patient: null,
    claim: null,
    admissionId: admissionId || null,
    patientId: context.patientId ?? null,
    claimId: null,
    preview,
    transactions: [...autoTransactions, ...manualTransactions],
    dailyCharges,
    finalBilling: buildFinalBillingSummary(chargeHeads),
    dataSource: 'api',
  };
}

/**
 * Future unified backend billing response → frontend bundle.
 * Pass-through only — fields mapped when backend contract is defined.
 */
export function mapBackendBillingBundleResponse(raw, context = {}) {
  if (!raw || typeof raw !== 'object') {
    return buildInsuranceBillingBundle({
      patient: context.patient,
      claim: context.claim,
      insuranceAdmit: context.insuranceAdmit,
      dataSource: 'api',
    });
  }

  const transactions = Array.isArray(raw.transactions)
    ? raw.transactions.map((row) => normalizeBillingTransaction(row, context))
    : [];

  const rawDaily =
    raw.daily_charges ?? raw.dailyCharges ?? null;
  const dailyCharges = Array.isArray(rawDaily)
    ? normalizeDailyCharges(rawDaily)
    : transactions.length
      ? normalizeDailyCharges(
          transactions.map((tx) => mapTransactionToDailyChargeRow(tx)),
        )
      : initDailyCharges(context.claim);

  const rawHeads = raw.charge_heads ?? raw.chargeHeads ?? raw.charges ?? null;
  const chargeHeads = Array.isArray(rawHeads)
    ? sortInsuranceChargeHeads(normalizeInsuranceChargeHeads(rawHeads))
    : initChargeHeadsFromClaim(context.claim);

  const claim = raw.claim
    ? {
        ...context.claim,
        ...raw.claim,
        charges: chargeHeads,
        dailyCharges,
        daily_charges: dailyCharges,
      }
    : context.claim;

  return {
    patient: raw.patient ?? context.patient ?? null,
    claim,
    admissionId:
      raw.admission_id ?? raw.admissionId ?? context.admissionId ?? null,
    patientId: raw.patient_id ?? raw.patientId ?? context.patientId ?? null,
    claimId: raw.claim_id ?? raw.claimId ?? context.claimId ?? null,
    paymentType: raw.payment_type ?? raw.paymentType ?? null,
    preview: raw.preview ?? null,
    transactions,
    dailyCharges,
    finalBilling: buildFinalBillingSummary(chargeHeads),
    dataSource: 'api',
  };
}

function categoryLabelFromSource(source) {
  switch (source) {
    case BILLING_SOURCE.ROOM:
      return 'Room Charges';
    case BILLING_SOURCE.DOCTOR:
      return 'Doctor Charges';
    case BILLING_SOURCE.PHARMACY:
      return 'Pharmacy';
    case BILLING_SOURCE.LABORATORY:
      return 'Laboratory';
    case BILLING_SOURCE.PROCEDURE:
      return 'Treatment';
    default:
      return 'Miscellaneous';
  }
}

export function selectDailyBillingFromBundle(bundle) {
  return bundle?.dailyCharges ?? [];
}

export function selectFinalBillingFromBundle(bundle) {
  return bundle?.finalBilling ?? buildFinalBillingSummary(cloneDefaultChargeHeads());
}

export function selectBillingTransactionsFromBundle(bundle) {
  return bundle?.transactions ?? [];
}
