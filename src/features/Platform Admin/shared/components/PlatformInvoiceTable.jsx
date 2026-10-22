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

const COLUMNS = ["Invoice", "Hospital", "Issued", "Due", "Amount", "Status", "Actions"];

function TableMessage({ children, alert = false }) {
  return (
    <tr>
      <td colSpan={COLUMNS.length}>
        <p className="panel-copy" role={alert ? "alert" : "status"} style={{ margin: "8px 0" }}>{children}</p>
      </td>
    </tr>
  );
}

export default function PlatformInvoiceTable({ invoices, loading, error, onPay, hospitalLink }) {
  let body;
  if (loading) {
    body = <TableMessage>Loading invoices from the server.</TableMessage>;
  } else if (error) {
    body = <TableMessage alert>{error}</TableMessage>;
  } else if (!invoices.length) {
    body = <TableMessage>No invoices match this view.</TableMessage>;
  } else {
    body = invoices.map((invoice) => (
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
    ));
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {COLUMNS.map((label) => <th key={label}>{label}</th>)}
          </tr>
        </thead>
        <tbody>{body}</tbody>
      </table>
    </div>
  );
}
