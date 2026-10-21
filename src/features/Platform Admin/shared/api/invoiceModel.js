import { addDays } from "../utils/formatDate.js";

const SERVER_STATUSES = new Set(["Pending", "Overdue", "Paid", "Failed"]);

export function mapPlatformInvoice(row) {
  if (!row || typeof row !== "object") return null;
  return {
    id: row.id,
    number: row.number || "",
    tenantId: row.tenant_id,
    hospitalName: row.hospital_name || "",
    hospitalCode: row.hospital_code || "",
    plan: row.plan || "",
    billingCycle: row.billing_cycle || "",
    subscriptionStatus: row.subscription_status || "",
    amount: row.amount,
    invoiceDate: row.invoice_date || "",
    dueDate: row.due_date || "",
    status: row.status || "",
    method: row.method || "",
    reference: row.reference || "",
    paidAt: row.paid_at || "",
    notes: row.notes || "",
    paymentAmount: row.payment_amount,
    recordedByName: row.recorded_by_name || "",
  };
}

/** Body for POST /platform/invoices/{id}/payments. Extra keys are rejected by the server. */
export function paymentRequestBody(form) {
  const reference = String(form.reference || "").trim();
  const notes = String(form.notes || "").trim();
  return {
    amount: Number(form.amount),
    method: String(form.method || "").trim(),
    reference: reference || null,
    paid_at: form.paidAt,
    notes: notes || null,
  };
}

function quarterKey(iso) {
  const month = Number(String(iso || "").slice(5, 7));
  if (!month) return "";
  return `${String(iso).slice(0, 4)}-Q${Math.ceil(month / 3)}`;
}

export function matchesInvoiceFilters(invoice, { query = "", status = "", period = "", today = "" } = {}) {
  const needle = query.trim().toLowerCase();
  if (needle) {
    const hay = [invoice.number, invoice.hospitalName, invoice.hospitalCode, invoice.plan].join(" ").toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  if (status === "collected" && invoice.status !== "Paid") return false;
  if (status === "pending" && invoice.status !== "Pending") return false;
  if (status === "overdue" && invoice.status !== "Overdue") return false;
  if (status === "failed" && invoice.status !== "Failed") return false;
  if (status === "soon") {
    if (invoice.status === "Paid" || !today || !invoice.dueDate || invoice.dueDate < today) return false;
    if (invoice.dueDate > addDays(today, 7)) return false;
  }
  if (status === "today") {
    if (invoice.status === "Paid" || invoice.dueDate !== today) return false;
  }
  if (SERVER_STATUSES.has(status) && invoice.status !== status) return false;
  if (period === "month" && today && !String(invoice.dueDate).startsWith(today.slice(0, 7))) return false;
  if (period === "quarter" && today && quarterKey(invoice.dueDate) !== quarterKey(today)) return false;
  return true;
}
