import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Pagination from "../../../shared/components/Pagination";
import RecordPaymentDialog from "../../../shared/components/RecordPaymentDialog";
import { LIST_PAGE_SIZE, usePagination } from "../../../shared/hooks/usePagination";
import { matchesInvoiceFilters, recentPaidInvoices } from "../../../shared/api/invoiceModel";
import { usePlatformInvoices } from "../../../shared/hooks/usePlatformInvoices";
import { accountsPath } from "../../../shared/paths";
import { formatDate, todayInput } from "../../../shared/utils/formatDate";
import { formatCurrency } from "../../../shared/utils/formatCurrency";
import { compareCollections, isUnpaid } from "../../../shared/utils/invoices";
import "../Accountant.css";

const CARDS = [
  { key: "today", label: "Due today", tone: "accounts-stat-today" },
  { key: "overdue", label: "Overdue", tone: "accounts-stat-overdue" },
  { key: "pending", label: "Pending", tone: "" },
  { key: "collected", label: "Collected", tone: "accounts-stat-collected" },
];

export default function Collections() {
  const today = todayInput();
  const { invoices, loading, error, reload } = usePlatformInvoices();
  const [active, setActive] = useState("");
  const [paying, setPaying] = useState(null);
  const [notice, setNotice] = useState("");

  const counts = useMemo(() => ({
    today: invoices.filter((invoice) => matchesInvoiceFilters(invoice, { status: "today", today })).length,
    overdue: invoices.filter((invoice) => invoice.status === "Overdue").length,
    pending: invoices.filter((invoice) => invoice.status === "Pending").length,
    collected: invoices.filter((invoice) => invoice.status === "Paid").length,
  }), [invoices, today]);

  const queue = useMemo(() => {
    const rows = invoices.filter((invoice) => (active ? matchesInvoiceFilters(invoice, { status: active, today }) : isUnpaid(invoice)));
    return [...rows].sort(compareCollections);
  }, [active, invoices, today]);
  const collected = useMemo(() => recentPaidInvoices(invoices, 5), [invoices]);
  const failed = useMemo(() => invoices.filter((invoice) => invoice.status === "Failed"), [invoices]);
  const queuePagination = usePagination(queue, LIST_PAGE_SIZE, active);
  const failedPagination = usePagination(failed, LIST_PAGE_SIZE);

  return (
    <section className="portal-page accounts-home">
      {error && <p className="accounts-note" role="alert">{error}</p>}
      {notice && <p className="accounts-note" role="status">{notice}</p>}

      <div className="portal-stats accounts-stats">
        {CARDS.map((card) => (
          <button
            key={card.key}
            type="button"
            className={`card accounts-stat ${card.tone}${active === card.key ? " is-active" : ""}`.trim()}
            onClick={() => setActive((current) => (current === card.key ? "" : card.key))}
          >
            <span>{card.label}</span>
            <strong>{loading || error ? "—" : counts[card.key]}</strong>
            <span className="accounts-count">{loading ? "Loading" : error ? "Unavailable" : `${counts[card.key]} invoices`}</span>
          </button>
        ))}
      </div>

      <section className="card card-pad">
        <div className="portal-head">
          <div>
            <h2>Collection queue</h2>
            <p>{active ? CARDS.find((card) => card.key === active)?.label : "Unpaid invoices that need a follow-up."}</p>
          </div>
          <Link to={accountsPath("/invoices")}>All invoices</Link>
        </div>
        <div className="portal-table-wrap">
          <table className="portal-table accounts-queue">
            <thead>
              <tr>
                <th>Hospital</th>
                <th>Invoice</th>
                <th>Due</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6}><p className="accounts-empty"><strong>Loading invoices</strong><span>Fetching the collection queue.</span></p></td></tr>
              ) : error ? (
                <tr><td colSpan={6}><p className="accounts-empty"><strong>Invoices could not be loaded</strong><span>{error}</span></p></td></tr>
              ) : queue.length === 0 ? (
                <tr><td colSpan={6}><p className="accounts-empty"><strong>No invoices in this queue.</strong><span>Nothing on the server matches this view.</span></p></td></tr>
              ) : queuePagination.rows.map((invoice) => (
                <tr key={invoice.id}>
                  <td><Link to={accountsPath(`/hospitals/${invoice.tenantId}`)}>{invoice.hospitalName || "Hospital"}</Link></td>
                  <td>{invoice.number || "—"}</td>
                  <td>{formatDate(invoice.dueDate)}</td>
                  <td>{formatCurrency(invoice.amount)}</td>
                  <td>{invoice.status || "—"}</td>
                  <td>
                    {isUnpaid(invoice) ? (
                      <button type="button" className="action-link" onClick={() => setPaying(invoice)}>Record payment</button>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && !error ? <Pagination {...queuePagination} onPageChange={queuePagination.setPage} /> : null}
      </section>

      <div className="portal-split accounts-lower">
        <section className="card card-pad">
          <div className="portal-head"><h2>Recent collections</h2></div>
          {loading ? (
            <p className="accounts-empty"><strong>Loading invoices</strong><span>Fetching paid invoices.</span></p>
          ) : error ? (
            <p className="accounts-empty"><strong>Invoices could not be loaded</strong><span>{error}</span></p>
          ) : collected.rows.length === 0 && collected.unorderedCount > 0 ? (
            <p className="accounts-empty"><strong>Payment dates are missing.</strong><span>Paid invoices are in this response, but none has a usable payment date, so they cannot be ordered.</span></p>
          ) : collected.rows.length === 0 ? (
            <p className="accounts-empty"><strong>Nothing collected yet.</strong><span>Paid invoices will list here.</span></p>
          ) : (
            <>
              <ul>
                {collected.rows.map((invoice) => (
                  <li key={invoice.id}>{invoice.hospitalName || "Hospital"} · {invoice.number} · {formatCurrency(invoice.paymentAmount ?? invoice.amount)}</li>
                ))}
              </ul>
              <p className="accounts-note">
                {collected.complete
                  ? "Newest paid invoices in this response, by payment date. The date has no time of day, so same-day payments stay in the returned order."
                  : "Some paid invoices have no usable payment date, so this is not a complete newest-five list. Rows that include a payment date are ordered newest first."}
              </p>
            </>
          )}
        </section>
        <section className="card card-pad">
          <div className="portal-head"><h2>Failed payments</h2></div>
          {loading ? (
            <p className="accounts-empty"><strong>Loading invoices</strong><span>Fetching failed payments.</span></p>
          ) : error ? (
            <p className="accounts-empty"><strong>Invoices could not be loaded</strong><span>{error}</span></p>
          ) : failed.length === 0 ? (
            <p className="accounts-empty"><strong>No failed payments.</strong><span>Failed charges will list here.</span></p>
          ) : (
            <>
              <ul>
                {failedPagination.rows.map((invoice) => (
                  <li key={invoice.id}>{invoice.hospitalName || "Hospital"} · {invoice.number} · {formatCurrency(invoice.amount)}</li>
                ))}
              </ul>
              <Pagination {...failedPagination} onPageChange={failedPagination.setPage} />
            </>
          )}
        </section>
      </div>
      {paying && (
        <RecordPaymentDialog
          invoice={paying}
          onClose={() => setPaying(null)}
          onRecorded={() => {
            setPaying(null);
            setNotice("Payment recorded.");
            reload();
          }}
        />
      )}
    </section>
  );
}
