import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  displayHospitalName,
  invoiceListCountLabel,
  invoiceListErrorMessage,
  mapPlatformInvoice,
  matchesInvoiceFilters,
  paymentRequestBody,
  readInvoiceList,
  monthlyCollectionComparison,
  recentPaidInvoices,
  sumPaidAmounts,
} from "./invoiceModel.js";

describe("platform invoice mapping", () => {
  const invoice = mapPlatformInvoice({
    id: 9,
    number: "INV-9",
    tenant_id: 4,
    hospital_name: "City Care",
    hospital_code: "CITY",
    plan: "Professional",
    billing_cycle: "Monthly",
    subscription_status: "Active",
    amount: 8999,
    invoice_date: "2026-10-01",
    due_date: "2026-10-15",
    status: "Pending",
    method: null,
    reference: null,
    paid_at: null,
    notes: null,
    payment_amount: null,
    recorded_by_name: null,
  });

  it("maps the invoice response without adding a payment", () => {
    assert.equal(invoice.tenantId, 4);
    assert.equal(invoice.hospitalName, "City Care");
    assert.equal(invoice.dueDate, "2026-10-15");
    assert.equal(invoice.amount, 8999);
    assert.equal(invoice.status, "Pending");
    assert.equal(invoice.paymentAmount, null);
  });

  it("sends only the payment fields the server accepts", () => {
    assert.deepEqual(paymentRequestBody({
      amount: "8999",
      method: "UPI",
      reference: " UTR1 ",
      paidAt: "2026-10-19",
      notes: "  ",
    }), {
      amount: 8999,
      method: "UPI",
      reference: "UTR1",
      paid_at: "2026-10-19",
      notes: null,
    });
  });

  it("filters a quarter in the browser and does not treat it as a server due value", () => {
    assert.equal(matchesInvoiceFilters(invoice, { period: "quarter", today: "2026-10-20" }), true);
    assert.equal(matchesInvoiceFilters(invoice, { period: "quarter", today: "2026-01-10" }), false);
    assert.equal(matchesInvoiceFilters(invoice, { status: "Paid" }), false);
    const source = readFileSync(new URL("./invoiceApi.js", import.meta.url), "utf8");
    assert.match(source, /\/platform\/invoices/);
    assert.match(source, /\/payments/);
    assert.doesNotMatch(source, /quarter/);
  });

  it("keeps due-soon on the calendar date", () => {
    const soon = { ...invoice, dueDate: "2026-10-28" };
    assert.equal(matchesInvoiceFilters(soon, { status: "soon", today: "2026-10-21" }), true);
    assert.equal(matchesInvoiceFilters(soon, { status: "soon", today: "2026-10-20" }), false);
    assert.equal(matchesInvoiceFilters({ ...soon, status: "Paid" }, { status: "soon", today: "2026-10-21" }), false);
  });

  it("sums paid invoices in the filtered list and withholds an incomplete total", () => {
    const paid = { ...invoice, status: "Paid", paymentAmount: 100, amount: 80, dueDate: "2026-10-01" };
    const paidByAmount = { ...invoice, id: 10, status: "Paid", paymentAmount: null, amount: 50, dueDate: "2026-10-02" };
    const pending = { ...invoice, id: 11, status: "Pending", amount: 999, dueDate: "2026-10-03" };
    const visible = [paid, paidByAmount, pending].filter((row) => matchesInvoiceFilters(row, { status: "Paid" }));
    assert.equal(visible.length, 2);
    assert.deepEqual(sumPaidAmounts(visible), { amount: 150, complete: true });
    assert.deepEqual(sumPaidAmounts([{ ...paid, paymentAmount: "nope", amount: "nope" }]), { amount: null, complete: false });
  });

  it("orders paid invoices by paid_at and does not invent a missing date", () => {
    const rows = [
      { id: 1, status: "Paid", paidAt: "2026-10-01" },
      { id: 2, status: "Paid", paidAt: "2026-10-20" },
      { id: 3, status: "Paid", paidAt: "2026-10-03" },
      { id: 4, status: "Pending", paidAt: "2026-10-21" },
      { id: 5, status: "Paid", paidAt: "2026-10-20" },
    ];
    const recent = recentPaidInvoices(rows, 2);
    assert.deepEqual(recent.rows.map((row) => row.id), [2, 5]);
    assert.equal(recent.complete, true);

    const partial = recentPaidInvoices([
      { id: 1, status: "Paid", paidAt: "2026-10-02" },
      { id: 2, status: "Paid", paidAt: "" },
      { id: 3, status: "Paid", paidAt: "not-a-date" },
    ]);
    assert.equal(partial.complete, false);
    assert.equal(partial.unorderedCount, 2);
    assert.deepEqual(partial.rows.map((row) => row.id), [1]);
  });

  it("compares collected amounts by payment month and omits a percentage when the previous month is zero", () => {
    const today = "2026-10-29";
    const compared = monthlyCollectionComparison([
      { id: 1, status: "Paid", paidAt: "2026-09-02", invoiceDate: "2026-10-01", dueDate: "2026-10-15", paymentAmount: 80, amount: 500 },
      { id: 2, status: "Paid", paidAt: "2026-10-04", paymentAmount: 100, amount: 40 },
      { id: 2, status: "Paid", paidAt: "2026-10-04", paymentAmount: 100, amount: 40 },
      { id: 3, status: "Paid", paidAt: "2026-10-19T15:00:00", paymentAmount: 50, amount: 10 },
      { id: 4, status: "Pending", paidAt: "2026-10-21", paymentAmount: 999 },
      { id: 5, status: "Failed", paidAt: "2026-10-11", paymentAmount: 999 },
      { id: 6, status: "Paid", paidAt: "2026-08-01", paymentAmount: 700 },
      { id: 7, status: "Paid", paidAt: "", invoiceDate: "2026-10-03", amount: 300 },
    ], today);

    assert.equal(compared.available, true);
    assert.equal(compared.previousLabel, "Sep 2026");
    assert.equal(compared.currentLabel, "Oct 2026");
    assert.equal(compared.previous, 80);
    assert.equal(compared.current, 150);
    assert.equal(compared.change, ((150 - 80) / 80) * 100);
    assert.equal(compared.undatedCount, 1);
    assert.notEqual(compared.change, Infinity);
    assert.equal(Number.isFinite(compared.change), true);

    const increased = monthlyCollectionComparison([
      { id: 1, status: "Paid", paidAt: "2026-09-10", paymentAmount: 200 },
      { id: 2, status: "Paid", paidAt: "2026-10-10", paymentAmount: 250 },
    ], today);
    assert.equal(increased.change, 25);

    const decreased = monthlyCollectionComparison([
      { id: 1, status: "Paid", paidAt: "2026-09-10", paymentAmount: 400 },
      { id: 2, status: "Paid", paidAt: "2026-10-10", paymentAmount: 100 },
    ], today);
    assert.equal(decreased.change, -75);

    const noBaseline = monthlyCollectionComparison([
      { id: 1, status: "Paid", paidAt: "2026-10-04", paymentAmount: 100 },
    ], today);
    assert.equal(noBaseline.available, true);
    assert.equal(noBaseline.previous, 0);
    assert.equal(noBaseline.current, 100);
    assert.equal(noBaseline.change, null);

    const neither = monthlyCollectionComparison([
      { id: 1, status: "Paid", paidAt: "2026-08-04", paymentAmount: 100 },
    ], today);
    assert.equal(neither.current, 0);
    assert.equal(neither.previous, 0);
    assert.equal(neither.change, null);

    const yearBoundary = monthlyCollectionComparison([
      { id: 1, status: "Paid", paidAt: "2025-12-20", paymentAmount: 40 },
      { id: 2, status: "Paid", paidAt: "2026-01-03", paymentAmount: 10 },
    ], "2026-01-10");
    assert.equal(yearBoundary.previousLabel, "Dec 2025");
    assert.equal(yearBoundary.currentLabel, "Jan 2026");
    assert.equal(yearBoundary.previous, 40);
    assert.equal(yearBoundary.current, 10);
    assert.equal(yearBoundary.change, -75);

    const missingAmount = monthlyCollectionComparison([
      { id: 1, status: "Paid", paidAt: "2026-10-04", paymentAmount: "nope", amount: "nope" },
    ], today);
    assert.equal(missingAmount.available, false);
    assert.equal(missingAmount.reason, "missing-amount");
    assert.equal(missingAmount.current, null);
    assert.equal(missingAmount.previous, null);
    assert.equal(missingAmount.change, null);

    const missingDate = monthlyCollectionComparison([
      { id: 1, status: "Paid", paidAt: "", invoiceDate: "2026-10-01", dueDate: "2026-10-20", amount: 80 },
      { id: 2, status: "Paid", paidAt: "2026-02-31", amount: 20 },
    ], today);
    assert.equal(missingDate.available, false);
    assert.equal(missingDate.reason, "missing-payment-date");
    assert.equal(missingDate.change, null);
  });

  it("counts every invoice from the list and keeps a 403 out of the empty state", () => {
    const rows = [
      { ...invoice, id: 1, status: "Paid", number: "A" },
      { ...invoice, id: 2, status: "Pending", number: "B" },
      { ...invoice, id: 3, status: "Overdue", number: "C" },
      { ...invoice, id: 4, status: "Failed", number: "D" },
    ];
    const pick = (status) => rows.filter((row) => matchesInvoiceFilters(row, { status })).map((row) => row.number);
    assert.deepEqual(pick(""), ["A", "B", "C", "D"]);
    assert.deepEqual(pick("collected"), ["A"]);
    assert.deepEqual(pick("pending"), ["B"]);
    assert.deepEqual(pick("overdue"), ["C"]);
    assert.deepEqual(pick("outstanding"), ["B", "C"]);
    assert.deepEqual(pick("failed"), ["D"]);
    assert.equal(invoiceListCountLabel({
      loading: false,
      error: "",
      total: rows.length,
      filtered: pick("collected").length,
      filterLabel: "",
    }), "4 invoices");
    assert.equal(invoiceListCountLabel({
      loading: false,
      error: "",
      total: rows.length,
      filtered: pick("collected").length,
      filterLabel: "Collected",
    }), "1 collected invoices");
    assert.equal(invoiceListCountLabel({
      loading: false,
      error: "Permission denied: invoices:manage required",
      total: 0,
      filtered: 0,
    }), "Invoices unavailable");
    assert.equal(invoiceListCountLabel({ loading: true, error: "", total: 0, filtered: 0 }), "Loading invoices");
    assert.equal(
      invoiceListErrorMessage("Permission denied: invoices:manage required", 403),
      "403 Forbidden. Permission denied: invoices:manage required",
    );
    assert.equal(
      invoiceListErrorMessage("Request failed", 403),
      "403 Forbidden. This account is not authorized to view invoices.",
    );
    assert.equal(invoiceListErrorMessage("Could not reach the server.", 0), "Could not reach the server.");

    const listed = readInvoiceList([
      {
        id: 9,
        number: "INV-9",
        tenant_id: 4,
        hospital_name: "City Care",
        hospital_code: "CITY",
        plan: "Professional",
        billing_cycle: "Monthly",
        amount: 8999,
        invoice_date: "2026-10-01",
        due_date: "2026-10-15",
        status: "Pending",
      },
    ]);
    assert.equal(listed.ok, true);
    assert.equal(listed.rows.length, 1);
    assert.equal(listed.rows[0].number, "INV-9");
    assert.equal(readInvoiceList({ items: [], total: 0 }).ok, false);

    const billing = readFileSync(new URL("../../panels/platformAdmin/pages/billing/InvoicesPayments.jsx", import.meta.url), "utf8");
    assert.match(billing, /usePlatformRevenue/);
    assert.match(billing, /usePlatformInvoices/);
    assert.match(billing, /invoiceListErrorMessage/);
    assert.match(billing, /No invoices yet/);
    assert.doesNotMatch(billing, /revenue\?\.invoices|revenue\.invoices|invoicesForBucket/);
  });

  it("rejects a non-list invoice payload and leaves a blank hospital name unset", () => {
    assert.equal(readInvoiceList({ items: [] }).ok, false);
    assert.equal(readInvoiceList([]).ok, true);
    assert.equal(readInvoiceList([]).rows.length, 0);
    assert.equal(displayHospitalName("  "), "Hospital name unavailable");
    assert.equal(displayHospitalName(" City Care "), "City Care");
    const collections = readFileSync(new URL("../../panels/accountant/pages/Collections.jsx", import.meta.url), "utf8");
    const invoices = readFileSync(new URL("../../panels/accountant/pages/InvoicesPayments.jsx", import.meta.url), "utf8");
    const billing = readFileSync(new URL("../../panels/accountant/pages/HospitalBilling.jsx", import.meta.url), "utf8");
    assert.match(collections, /recentPaidInvoices/);
    assert.match(collections, /monthlyCollectionComparison/);
    assert.match(collections, /Recent Activity/);
    assert.match(collections, /Monthly Comparison/);
    assert.doesNotMatch(collections, /Failed payments/);
    assert.doesNotMatch(collections, /failedPagination/);
    assert.doesNotMatch(invoices, /sumPaidAmounts|Collected in this list|invoices in this list/);
    assert.match(billing, /Hospital name unavailable/);
    assert.match(billing, /displayHospitalName/);
  });
});
