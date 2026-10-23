import { displayHospitalName } from "../api/invoiceModel";
import { formatDate } from "../utils/formatDate";
import { formatCurrency } from "../utils/formatCurrency";

function money(value) {
  if (value == null || value === "" || !Number.isFinite(Number(value))) return "—";
  return formatCurrency(value);
}

function StatusChip({ status }) {
  const tone = { Paid: "paid", Pending: "pending", Overdue: "overdue", Failed: "failed" }[status] || "pending";
  return <span className={`inv-chip inv-chip-${tone}`}>{status || "—"}</span>;
}

function hasPaymentRecord(invoice) {
  return Boolean(
    invoice?.status === "Paid"
    || invoice?.paidAt
    || invoice?.method
    || invoice?.reference
    || invoice?.notes
    || invoice?.recordedByName
    || (invoice?.paymentAmount != null && invoice.paymentAmount !== ""),
  );
}

export function InvoiceSheet({ invoice }) {
  const paid = invoice.status === "Paid";
  const description = [invoice.plan || "Subscription", invoice.billingCycle].filter(Boolean).join(" · ");
  const total = paid && invoice.paymentAmount != null && invoice.paymentAmount !== ""
    ? invoice.paymentAmount
    : invoice.amount;

  return (
    <article className="invoice-sheet">
      <header className="invoice-top">
        <div>
          <strong className="invoice-brand">SaffoCare</strong>
          <span>Platform subscription invoice</span>
          <span>Accountant portal</span>
        </div>
        <div className="invoice-title">
          <h3>INVOICE</h3>
          <span className="inv-mono">{invoice.number || "—"}</span>
          <StatusChip status={invoice.status} />
        </div>
      </header>
      <div className="invoice-parties">
        <div>
          <span className="invoice-label">Billed to</span>
          <strong>{displayHospitalName(invoice.hospitalName)}</strong>
          <span>{[invoice.hospitalCode, invoice.plan].filter(Boolean).join(" · ") || "—"}</span>
          {invoice.subscriptionStatus ? <span>Subscription {invoice.subscriptionStatus}</span> : null}
        </div>
        <dl>
          <div><dt>Issued</dt><dd>{formatDate(invoice.invoiceDate)}</dd></div>
          <div><dt>Due</dt><dd>{formatDate(invoice.dueDate)}</dd></div>
          <div><dt>Cycle</dt><dd>{invoice.billingCycle || "—"}</dd></div>
        </dl>
      </div>
      <table className="invoice-lines">
        <thead>
          <tr>
            <th>Description</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{description}</td>
            <td className="num">{money(invoice.amount)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td className="num">{money(total)}</td>
          </tr>
        </tfoot>
      </table>
      <div className="invoice-log">
        {hasPaymentRecord(invoice) ? (
          <>
            <strong>Payment record</strong>
            <span>Paid {formatDate(invoice.paidAt)}</span>
            <span>
              Method {invoice.method || "—"}
              {invoice.reference ? ` · ${invoice.method === "UPI" ? "UPI ID" : "Reference"} ${invoice.reference}` : ""}
            </span>
            <span>Amount {money(invoice.paymentAmount != null && invoice.paymentAmount !== "" ? invoice.paymentAmount : invoice.amount)}</span>
            <span>Recorded by {invoice.recordedByName || "—"}</span>
            {invoice.notes ? <span>Notes {invoice.notes}</span> : null}
          </>
        ) : (
          <span>No payment has been recorded for this invoice.</span>
        )}
        <span>Computer-generated invoice. No physical stamp required.</span>
      </div>
    </article>
  );
}

export default function InvoicePrintSheets({ invoices }) {
  if (!invoices?.length) return null;
  return (
    <div className="invoice-print-stack">
      {invoices.map((invoice) => <InvoiceSheet key={invoice.id} invoice={invoice} />)}
    </div>
  );
}
