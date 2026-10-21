import { daysUntil, formatDate } from "../utils/formatDate";
import { formatCurrency } from "../utils/formatCurrency";
import { isUnpaid } from "../utils/invoices";

function StatusChip({ status }) {
  const tone = { Paid: "paid", Pending: "pending", Overdue: "overdue", Failed: "failed" }[status] || "pending";
  return <span className={`inv-chip inv-chip-${tone}`}>{status || "—"}</span>;
}

function DueCell({ invoice }) {
  if (!invoice.dueDate) return <span>—</span>;
  if (invoice.status === "Paid") return <span>{formatDate(invoice.dueDate)}</span>;
  const days = daysUntil(invoice.dueDate);
  let hint = `in ${days} days`;
  let tone = "";
  if (days < 0) { hint = `${Math.abs(days)} days late`; tone = "late"; }
  else if (days === 0) { hint = "due today"; tone = "soon"; }
  else if (days <= 7) tone = "soon";
  return (
    <span className="inv-due">
      {formatDate(invoice.dueDate)}
      <small className={tone}>{hint}</small>
    </span>
  );
}

export default function PlatformInvoiceTable({ invoices, loading, error, onPay, hospitalLink }) {
  if (loading) {
    return <p className="panel-copy">Loading invoices from the server.</p>;
  }
  if (error) {
    return <p className="panel-copy" role="alert">{error}</p>;
  }
  if (!invoices.length) {
    return <p className="panel-copy">No invoices match this view.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Hospital</th>
            <th>Issued</th>
            <th>Due</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td className="inv-mono">{invoice.number || "—"}</td>
              <td>
                <div className="inv-name">{hospitalLink ? hospitalLink(invoice) : (invoice.hospitalName || "—")}</div>
                <div className="inv-sub">{[invoice.hospitalCode, invoice.plan].filter(Boolean).join(" · ") || "—"}</div>
              </td>
              <td>{formatDate(invoice.invoiceDate)}</td>
              <td><DueCell invoice={invoice} /></td>
              <td className="inv-amount">{formatCurrency(invoice.amount)}</td>
              <td><StatusChip status={invoice.status} /></td>
              <td>
                {isUnpaid(invoice) ? (
                  <button type="button" className="action-link" onClick={() => onPay(invoice)}>Record payment</button>
                ) : (
                  <span className="inv-sub">{invoice.paidAt ? `Paid ${formatDate(invoice.paidAt)}` : "—"}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
