import { Link, useNavigate } from "react-router-dom";
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

function TableMessage({ columns, children, alert = false }) {
  return (
    <tr>
      <td colSpan={columns}>
        <p className="panel-copy" role={alert ? "alert" : "status"} style={{ margin: "8px 0" }}>{children}</p>
      </td>
    </tr>
  );
}

const LIST_COLUMNS = ["Invoice", "Hospital", "Issued", "Due", "Amount", "Status", "Actions"];
const RECORD_COLUMNS = ["Invoice", "Hospital", "Issued", "Due", "Amount", "Status", "Method", "Reference", "Paid on", "Recorded by", "Actions"];

export default function PlatformInvoiceTable({ invoices, loading, error, onPay, onPrint, hospitalLink, viewPath, showRecords = false }) {
  const navigate = useNavigate();
  const columns = showRecords ? RECORD_COLUMNS : LIST_COLUMNS;

  let body;
  if (loading) {
    body = <TableMessage columns={columns.length}>Loading invoices from the server.</TableMessage>;
  } else if (error) {
    body = <TableMessage columns={columns.length} alert>{error}</TableMessage>;
  } else if (!invoices.length) {
    body = <TableMessage columns={columns.length}>No invoices match this view.</TableMessage>;
  } else {
    body = invoices.map((invoice) => {
      const href = viewPath ? viewPath(invoice) : "";
      const openHospital = () => {
        if (href) navigate(href);
      };
      return (
        <tr
          key={invoice.id}
          className={href ? "inv-row-link" : undefined}
          onClick={href ? openHospital : undefined}
        >
          <td className="inv-mono">{invoice.number || "—"}</td>
          <td>
            <div className="inv-name">{hospitalLink ? hospitalLink(invoice) : (invoice.hospitalName || "—")}</div>
            <div className="inv-sub">{[invoice.hospitalCode, invoice.plan].filter(Boolean).join(" · ") || "—"}</div>
          </td>
          <td>{formatDate(invoice.invoiceDate)}</td>
          <td><DueCell invoice={invoice} /></td>
          <td className="inv-amount">{formatCurrency(invoice.amount)}</td>
          <td><StatusChip status={invoice.status} /></td>
          {showRecords && (
            <>
              <td>{invoice.method || "—"}</td>
              <td>
                {invoice.method === "UPI" ? <span className="inv-sub">UPI ID</span> : null}
                {invoice.reference || "—"}
              </td>
              <td>{invoice.paidAt ? formatDate(invoice.paidAt) : "—"}</td>
              <td>{invoice.recordedByName || "—"}</td>
            </>
          )}
          <td onClick={(event) => event.stopPropagation()}>
            <div className="inv-actions">
              {onPrint && (
                <button type="button" className="action-link" onClick={() => onPrint(invoice)}>Print</button>
              )}
              {href ? (
                <Link to={href} className="action-link">View</Link>
              ) : isUnpaid(invoice) && onPay ? (
                <button type="button" className="action-link strong" onClick={() => onPay(invoice)}>Record payment</button>
              ) : !onPrint ? (
                <span className="inv-sub">{invoice.paidAt ? `Paid ${formatDate(invoice.paidAt)}` : "—"}</span>
              ) : null}
            </div>
            {onPrint && !href && !isUnpaid(invoice) && (
              <span className="inv-sub">{invoice.paidAt ? `Paid ${formatDate(invoice.paidAt)}` : "Paid"}</span>
            )}
          </td>
        </tr>
      );
    });
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((label) => <th key={label}>{label}</th>)}
          </tr>
        </thead>
        <tbody>{body}</tbody>
      </table>
    </div>
  );
}
