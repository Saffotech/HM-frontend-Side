import { platformApi } from "./platformClient";

const STATUSES = new Set(["All", "Pending", "Overdue", "Paid", "Failed"]);
const DUE = new Set(["All", "today", "month"]);

export function listInvoices({ status = "All", due = "All", tenantId } = {}) {
  const params = new URLSearchParams();
  params.set("status", STATUSES.has(status) ? status : "All");
  params.set("due", DUE.has(due) ? due : "All");
  if (tenantId != null && String(tenantId).trim() !== "") params.set("tenant_id", String(tenantId));
  return platformApi(`/platform/invoices?${params.toString()}`);
}

export function recordInvoicePayment(invoiceId, body) {
  return platformApi(`/platform/invoices/${encodeURIComponent(invoiceId)}/payments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
