import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  displayHospitalName,
  mapPlatformInvoice,
  matchesInvoiceFilters,
  paymentRequestBody,
  readInvoiceList,
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
    assert.match(invoices, /sumPaidAmounts/);
    assert.match(invoices, /Collected —/);
    assert.match(billing, /Hospital name unavailable/);
    assert.match(billing, /displayHospitalName/);
  });
});
