import { parseLeadList } from "./leadPayloads.js";

function displayName(value) {
  return String(value ?? "").trim();
}

function optionalNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function mapPerformanceEmployee(employee) {
  if (!employee || typeof employee !== "object") return null;
  const name = displayName(employee.name);
  if (!name) return null;
  return {
    id: employee.id ?? null,
    name,
    portal: "crm",
    role: "CRM",
  };
}

/** Paid rows only. A pending invoice in this list must not become revenue. */
export function mapPerformanceInvoice(invoice) {
  if (!invoice || typeof invoice !== "object" || invoice.tenant_id == null) return null;
  const status = displayName(invoice.status);
  if (status && status !== "Paid") return null;
  return {
    tenantId: invoice.tenant_id,
    status: "Paid",
    amount: optionalNumber(invoice.amount),
    paymentAmount: optionalNumber(invoice.payment_amount),
    invoiceDate: displayName(invoice.invoice_date),
  };
}

export function parseCrmPerformance(body, session) {
  const empty = { ok: false, onboarding: [], crmUsers: [], invoices: [], error: "CRM performance response was not recognized." };
  if (!body || typeof body !== "object" || Array.isArray(body)) return empty;
  if (!Array.isArray(body.leads) || !Array.isArray(body.employees) || !Array.isArray(body.paid_invoices)) return empty;
  const leads = parseLeadList(body.leads, session);
  if (!leads.ok) return { ...empty, error: leads.error };
  return {
    ok: true,
    onboarding: leads.rows,
    crmUsers: body.employees.map(mapPerformanceEmployee).filter(Boolean),
    invoices: body.paid_invoices.map(mapPerformanceInvoice).filter(Boolean),
    error: "",
  };
}
