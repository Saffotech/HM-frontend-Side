import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../../../shared/components/Button";
import { invoicesForBucket } from "../../../../shared/api/platformRevenue";
import { usePlatformRevenue } from "../../../../shared/hooks/usePlatformRevenue";
import { formatDate } from "../../../../shared/utils/formatDate";
import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { platformPath } from "../../../../shared/paths";
import "./InvoicesPayments.css";

const CARDS = [
  {
    key: "collected",
    label: "Collected",
    tone: "tone-paid",
    value: (revenue) => formatCurrency(revenue.collectedAmount),
    detail: (revenue) => `${revenue.collectedCount} paid`,
    empty: "Paid invoices",
    total: (revenue) => formatCurrency(revenue.collectedAmount),
  },
  {
    key: "pending",
    label: "Pending",
    tone: "tone-pending",
    value: (revenue) => formatCurrency(revenue.pendingAmount),
    detail: (revenue) => `${revenue.pendingCount} not past due`,
    empty: "Pending",
    total: (revenue) => formatCurrency(revenue.pendingAmount),
  },
  {
    key: "overdue",
    label: "Overdue",
    tone: "tone-overdue",
    value: (revenue) => formatCurrency(revenue.overdueAmount),
    detail: (revenue) => `${revenue.overdueCount} past due`,
    empty: "Past due",
    total: (revenue) => formatCurrency(revenue.overdueAmount),
  },
  {
    key: "outstanding",
    label: "Outstanding",
    tone: "tone-soon",
    value: (revenue) => formatCurrency(revenue.outstandingAmount),
    detail: () => "Pending + overdue",
    empty: "Pending + overdue",
    total: (revenue) => formatCurrency(revenue.outstandingAmount),
  },
  {
    key: "failed",
    label: "Failed",
    tone: "tone-failed",
    value: (revenue) => String(revenue.failedCount),
    detail: () => "Counted, not added into the money",
    empty: "Counted, not added into the money",
    total: () => "Not included",
  },
];

const STATUS_TONE = { Paid: "paid", Pending: "pending", Overdue: "overdue", Failed: "failed" };

function StatusChip({ status }) {
  const tone = STATUS_TONE[status] || "pending";
  return <span className={`inv-chip inv-chip-${tone}`}>{status || "—"}</span>;
}

function HospitalCell({ invoice }) {
  const name = invoice.hospitalName || "Hospital";
  const meta = [invoice.hospitalCode, invoice.plan, invoice.billingCycle].filter(Boolean).join(" · ");
  return (
    <>
      <div className="inv-name">
        {invoice.tenantId == null ? name : (
          <Link to={platformPath(`/hospitals/${invoice.tenantId}`)}>{name}</Link>
        )}
      </div>
      <div className="inv-sub">{meta || "—"}</div>
    </>
  );
}

export default function InvoicesPayments() {
  const navigate = useNavigate();
  const { revenue, loading, error, reload } = usePlatformRevenue();
  const [filter, setFilter] = useState("");
  const active = CARDS.find((card) => card.key === filter) || null;
  const visible = useMemo(
    () => invoicesForBucket(revenue?.invoices, filter),
    [filter, revenue],
  );

  return (
    <section className="inv-page">
      <header className="page-header">
        <h1>Billing & Revenue</h1>
        <Button variant="secondary" onClick={reload} disabled={loading}>{loading ? "Loading…" : "Refresh"}</Button>
      </header>

      {error && (
        <div role="alert">
          <p className="panel-copy">{error}</p>
          <Button variant="secondary" onClick={reload}>Try again</Button>
        </div>
      )}

      <div className="inv-summary" role="group" aria-label="Filter invoices">
        {CARDS.map((card) => {
          const selected = filter === card.key;
          return (
            <button
              key={card.key}
              type="button"
              className={`inv-summary-item${selected ? " selected" : ""}`}
              aria-pressed={selected}
              onClick={() => setFilter((current) => (current === card.key ? "" : card.key))}
            >
              <span>{card.label}</span>
              <strong className={card.tone}>{loading && !revenue ? "…" : revenue ? card.value(revenue) : "—"}</strong>
              <small>{revenue ? card.detail(revenue) : card.empty}</small>
            </button>
          );
        })}
      </div>

      <section className="inv-panel">
        <div className="inv-meta">
          <span>
            {loading && !revenue
              ? "Loading invoices"
              : active
                ? `${visible.length} ${active.label.toLowerCase()} invoices`
                : `${visible.length} invoices`}
          </span>
          <span>
            {!revenue
              ? "Collected —"
              : !active
                ? `Collected ${formatCurrency(revenue.collectedAmount)}`
                : active.key === "failed"
                  ? "Not included in the money"
                  : `${active.label} ${active.total(revenue)}`}
          </span>
        </div>
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
              </tr>
            </thead>
            <tbody>
              {loading && !revenue ? (
                <tr>
                  <td colSpan={6}><p className="panel-copy" style={{ margin: "8px 0" }}>Loading invoices.</p></td>
                </tr>
              ) : !revenue ? (
                <tr>
                  <td colSpan={6}><p className="panel-copy" style={{ margin: "8px 0" }}>{error || "No revenue totals yet."}</p></td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <p className="panel-copy" style={{ margin: "8px 0" }}>
                      {active ? `No ${active.label.toLowerCase()} invoices.` : "No invoices yet."}
                    </p>
                  </td>
                </tr>
              ) : visible.map((invoice) => {
                const hospitalPath = invoice.tenantId == null ? "" : platformPath(`/hospitals/${invoice.tenantId}`);
                return (
                  <tr
                    key={invoice.id}
                    className={hospitalPath ? "inv-row-link" : undefined}
                    onClick={hospitalPath ? () => navigate(hospitalPath) : undefined}
                  >
                    <td className="inv-mono">{invoice.number || "—"}</td>
                    <td><HospitalCell invoice={invoice} /></td>
                    <td>{formatDate(invoice.invoiceDate)}</td>
                    <td>{formatDate(invoice.dueDate)}</td>
                    <td className="inv-amount">
                      {formatCurrency(invoice.bucket === "collected" && invoice.paymentAmount != null ? invoice.paymentAmount : invoice.amount)}
                    </td>
                    <td><StatusChip status={invoice.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
