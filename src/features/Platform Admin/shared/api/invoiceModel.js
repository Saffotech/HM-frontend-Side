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

function calendarMonthKey(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || "").trim());
  if (!match) return "";
  const month = Number(match[2]);
  if (month < 1 || month > 12) return "";
  return `${match[1]}-${match[2]}`;
}

function shiftMonthKey(yearMonth, offset) {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth || "");
  if (!match) return "";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function paidMonthKey(value) {
  if (paidAtSortValue(value) == null) return "";
  const match = PAID_AT.exec(String(value ?? "").trim());
  return match ? `${match[1]}-${match[2]}` : "";
}

function monthLabel(yearMonth) {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth || "");
  if (!match) return "";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function collectionChangePercent(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  const change = ((current - previous) / previous) * 100;
  return Number.isFinite(change) ? change : null;
}

/**
 * Collected totals for the current calendar month and the previous one.
 * Month membership comes from paid_at. Invoice date and due date are ignored.
 * A zero previous month has no percentage, so the result is never Infinity or NaN.
 */
export function monthlyCollectionComparison(invoices, today) {
  const currentKey = calendarMonthKey(today);
  const previousKey = currentKey ? shiftMonthKey(currentKey, -1) : "";
  const seen = new Set();
  let current = 0;
  let previous = 0;
  let currentComplete = true;
  let previousComplete = true;
  let datedPaid = 0;
  let undatedPaid = 0;

  (Array.isArray(invoices) ? invoices : []).forEach((invoice) => {
    if (invoice?.status !== "Paid") return;
    const id = invoice?.id;
    if (id != null && id !== "") {
      const key = String(id);
      if (seen.has(key)) return;
      seen.add(key);
    }
    const month = paidMonthKey(invoice?.paidAt);
    if (!month) {
      undatedPaid += 1;
      return;
    }
    datedPaid += 1;
    if (month !== currentKey && month !== previousKey) return;
    const value = paidInvoiceAmount(invoice);
    if (month === currentKey) {
      if (value == null) currentComplete = false;
      else current += value;
    } else if (value == null) previousComplete = false;
    else previous += value;
  });

  let reason = "ok";
  if (!currentKey || !previousKey) reason = "invalid-period";
  else if (!currentComplete || !previousComplete) reason = "missing-amount";
  else if (datedPaid === 0 && undatedPaid > 0) reason = "missing-payment-date";

  const available = reason === "ok";
  return {
    available,
    reason,
    currentLabel: monthLabel(currentKey),
    previousLabel: monthLabel(previousKey),
    current: available ? current : null,
    previous: available ? previous : null,
    change: available ? collectionChangePercent(current, previous) : null,
    undatedCount: undatedPaid,
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

export function matchesInvoiceFilters(invoice, { query = "", status = "", period = "", today = "", dateFrom = "", dateTo = "" } = {}) {
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
  if (period === "custom") {
    const issueDate = String(invoice.invoiceDate || "").slice(0, 10);
    if (!issueDate || (dateFrom && issueDate < dateFrom) || (dateTo && issueDate > dateTo)) return false;
  }
  return true;
}
