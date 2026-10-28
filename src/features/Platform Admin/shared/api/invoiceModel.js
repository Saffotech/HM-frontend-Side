const SERVER_STATUSES = new Set(["Pending", "Overdue", "Paid", "Failed"]);
const PAID_AT = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/;

function calendarDaysAfter(isoDate, days) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || ""));
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function displayHospitalName(value) {
  const text = String(value ?? "").trim();
  return text || "Hospital name unavailable";
}

export function readInvoiceList(body) {
  if (!Array.isArray(body)) {
    return { ok: false, rows: [], error: "Invoice list response was not a list, so totals are not shown." };
  }
  const rows = [];
  for (const row of body) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return { ok: false, rows: [], error: "Invoice list response did not match the invoice list, so totals are not shown." };
    }
    const mapped = mapPlatformInvoice(row);
    if (!mapped) {
      return { ok: false, rows: [], error: "Invoice list response did not match the invoice list, so totals are not shown." };
    }
    rows.push(mapped);
  }
  return { ok: true, rows, error: "" };
}

/** 403 stays a permission error. Other failures keep the message from the client. */
export function invoiceListErrorMessage(error, status) {
  if (Number(status) !== 403) return String(error || "");
  const detail = String(error || "").trim();
  const specific = detail && detail !== "Request failed" && detail !== "Permission denied";
  return specific
    ? `403 Forbidden. ${detail}`
    : "403 Forbidden. This account is not authorized to view invoices.";
}

/** Count rows from the invoice list. A failed request is not reported as zero invoices. */
export function invoiceListCountLabel({ loading, error, total, filtered, filterLabel = "" } = {}) {
  if (loading) return "Loading invoices";
  if (error) return "Invoices unavailable";
  const count = Number(filterLabel ? filtered : total);
  const shown = Number.isFinite(count) ? count : 0;
  return filterLabel ? `${shown} ${String(filterLabel).toLowerCase()} invoices` : `${shown} invoices`;
}

function paidInvoiceAmount(invoice) {
  if (invoice?.paymentAmount != null && invoice.paymentAmount !== "") {
    const payment = Number(invoice.paymentAmount);
    return Number.isFinite(payment) ? payment : null;
  }
  if (invoice?.amount != null && invoice.amount !== "") {
    const amount = Number(invoice.amount);
    return Number.isFinite(amount) ? amount : null;
  }
  return null;
}

/** Sum of paid invoices only. Incomplete means a paid row had no usable amount. */
export function sumPaidAmounts(invoices) {
  let amount = 0;
  let complete = true;
  (Array.isArray(invoices) ? invoices : []).forEach((invoice) => {
    if (invoice?.status !== "Paid") return;
    const value = paidInvoiceAmount(invoice);
    if (value == null) {
      complete = false;
      return;
    }
    amount += value;
  });
  return { amount: complete ? amount : null, complete };
}

/** Date-only paid_at. Missing or invalid dates are not given a guessed time. */
export function paidAtSortValue(value) {
  const match = PAID_AT.exec(String(value ?? "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.getTime();
}

export function recentPaidInvoices(invoices, limit = 5) {
  const paid = (Array.isArray(invoices) ? invoices : []).filter((invoice) => invoice?.status === "Paid");
  const ordered = [];
  let unorderedCount = 0;
  paid.forEach((invoice) => {
    const time = paidAtSortValue(invoice.paidAt);
    if (time == null) unorderedCount += 1;
    else ordered.push({ invoice, time });
  });
  ordered.sort((left, right) => right.time - left.time);
  return {
    rows: ordered.slice(0, limit).map((item) => item.invoice),
    unorderedCount,
    complete: unorderedCount === 0,
  };
}

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
  if (status === "outstanding" && invoice.status !== "Pending" && invoice.status !== "Overdue") return false;
  if (status === "failed" && invoice.status !== "Failed") return false;
  if (status === "soon") {
    if (invoice.status === "Paid" || !today || !invoice.dueDate || invoice.dueDate < today) return false;
    const end = calendarDaysAfter(today, 7);
    if (!end || invoice.dueDate > end) return false;
  }
  if (status === "today") {
    if (invoice.status === "Paid" || invoice.dueDate !== today) return false;
  }
  if (SERVER_STATUSES.has(status) && invoice.status !== status) return false;
  if (period === "month" && today && !String(invoice.dueDate).startsWith(today.slice(0, 7))) return false;
  if (period === "quarter" && today && quarterKey(invoice.dueDate) !== quarterKey(today)) return false;
  return true;
}
