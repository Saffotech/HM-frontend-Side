import { monthKey, todayInput } from "./formatDate";

export const UNPAID = ["Pending", "Overdue", "Failed"];
export const PAYMENT_METHODS = ["Bank transfer", "UPI", "Card", "Cheque"];

export function isUnpaid(invoice) {
  return UNPAID.includes(invoice.status);
}

export function compareCollections(left, right) {
  const today = todayInput();
  const rank = (invoice) => {
    if (invoice.status === "Overdue" || invoice.dueDate < today) return 0;
    if (invoice.dueDate === today) return 1;
    return 2;
  };
  const byRank = rank(left) - rank(right);
  if (byRank) return byRank;
  return left.dueDate.localeCompare(right.dueDate);
}

export function subscriptionIdFromTenant(tenantId) {
  return `SUB-${String(tenantId || "").replace(/^TNT-/, "")}`;
}

export function billingFor(invoice, hospitals) {
  const subscriptionId = invoice.subscriptionId || subscriptionIdFromTenant(invoice.tenantId);
  const hospital = (hospitals || []).find((item) => item.id === invoice.tenantId) || null;
  const hospitalSubscriptionId = hospital ? (hospital.subscriptionId || subscriptionIdFromTenant(hospital.id)) : "";
  const linked = Boolean(hospital) && hospitalSubscriptionId === subscriptionId;
  return {
    linked,
    hospitalName: linked ? hospital.name : "Unknown customer",
    plan: linked ? hospital.plan : "—",
    cycle: linked ? hospital.billingCycle : "—",
    subscriptionStatus: linked ? hospital.subscriptionStatus : "—",
    subscriptionId,
    tenantId: invoice.tenantId,
  };
}

export function collectedThisMonth(invoices, month = todayInput().slice(0, 7)) {
  return invoices.filter((invoice) => invoice.status === "Paid" && monthKey(invoice.paidAt || invoice.invoiceDate) === month);
}

export function paymentErrors(form) {
  const errors = {};
  const amount = Number(form.amount);
  if (String(form.amount ?? "").trim() === "" || Number.isNaN(amount) || amount <= 0) errors.amount = "Enter the payment amount.";
  if (!form.method) errors.method = "Choose a payment method.";
  if (!form.paidAt) errors.paidAt = "Choose the payment date.";
  if (form.method !== "Card" && !String(form.reference || "").trim()) errors.reference = "Enter the payment reference.";
  return errors;
}
