import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { mapPlatformInvoice, matchesInvoiceFilters, paymentRequestBody } from "./invoiceModel.js";

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
});
