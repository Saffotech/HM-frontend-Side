import { billingCycles } from "../data/catalog.js";

export function mapPlatformPlans(body) {
  if (!Array.isArray(body)) return { ok: false, plans: [] };
  return {
    ok: true,
    plans: body.flatMap((row) => {
      const name = String(row?.name || "").trim();
      if (!name) return [];
      const cycles = Array.isArray(row.billing_cycles)
        ? row.billing_cycles.filter((cycle) => billingCycles.includes(cycle))
        : [];
      return [{
        name,
        monthlyPrice: row.monthly_price,
        annualPrice: row.annual_price,
        billingCycles: cycles,
        isActive: row.is_active !== false,
      }];
    }),
  };
}

export function activePlanNames(plans) {
  return (Array.isArray(plans) ? plans : []).filter((plan) => plan.isActive).map((plan) => plan.name);
}

export function cyclesForPlan(plan) {
  return plan?.billingCycles?.length ? plan.billingCycles : billingCycles;
}

/** Catalog price for the selected cycle. Annual is the server's annual_price. */
export function catalogPrice(plan, cycle) {
  if (!plan) return null;
  const value = cycle === "Annual" ? plan.annualPrice : plan.monthlyPrice;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

const REVENUE_KEYS = [
  "collected_amount",
  "collected_count",
  "pending_amount",
  "pending_count",
  "overdue_amount",
  "overdue_count",
  "outstanding_amount",
  "failed_count",
  "invoice_count",
];

function amount(body, key) {
  const value = Number(body?.[key]);
  return Number.isFinite(value) ? value : 0;
}

export function mapPlatformRevenue(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, revenue: null };
  if (!REVENUE_KEYS.some((key) => key in body)) return { ok: false, revenue: null };
  return {
    ok: true,
    revenue: {
      collectedAmount: amount(body, "collected_amount"),
      collectedCount: amount(body, "collected_count"),
      pendingAmount: amount(body, "pending_amount"),
      pendingCount: amount(body, "pending_count"),
      overdueAmount: amount(body, "overdue_amount"),
      overdueCount: amount(body, "overdue_count"),
      outstandingAmount: amount(body, "outstanding_amount"),
      failedCount: amount(body, "failed_count"),
      invoiceCount: amount(body, "invoice_count"),
    },
  };
}

/** Money buckets only. Failed invoices stay out of the amounts. */
export function revenueSnapshot(revenue) {
  if (!revenue) return [];
  return [
    { label: "Collected", revenue: revenue.collectedAmount },
    { label: "Pending", revenue: revenue.pendingAmount },
    { label: "Overdue", revenue: revenue.overdueAmount },
  ];
}

export const CRM_ANALYTICS_STATUSES = ["New", "Contacted", "Agreed", "Registered", "Not Interested"];

function count(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function mapCrmAnalytics(body) {
  const source = body?.statuses;
  if (!source || typeof source !== "object" || Array.isArray(source)) return { ok: false, statuses: null };
  const statuses = {};
  CRM_ANALYTICS_STATUSES.forEach((key) => {
    statuses[key] = count(source[key]);
  });
  const listed = CRM_ANALYTICS_STATUSES.reduce((sum, key) => sum + statuses[key], 0);
  statuses.total = source.total == null ? listed : count(source.total);
  return { ok: true, statuses };
}
