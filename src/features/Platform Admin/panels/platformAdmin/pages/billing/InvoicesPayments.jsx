import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../../../shared/components/Button";
import Pagination from "../../../../shared/components/Pagination";
import { invoiceListCountLabel, invoiceListErrorMessage, matchesInvoiceFilters } from "../../../../shared/api/invoiceModel";
import { LIST_PAGE_SIZE, usePagination } from "../../../../shared/hooks/usePagination";
import { usePlatformInvoices } from "../../../../shared/hooks/usePlatformInvoices";
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

function invoiceAmount(invoice) {
  if (invoice.status === "Paid" && invoice.paymentAmount != null && invoice.paymentAmount !== "") {
    return invoice.paymentAmount;
  }
  return invoice.amount;
}

export default function InvoicesPayments() {
  const navigate = useNavigate();
  const { revenue, loading: revenueLoading, error: revenueError, reload: reloadRevenue } = usePlatformRevenue();
  const {
    invoices,
    loading: invoicesLoading,
    error: invoicesError,
    errorStatus: invoicesErrorStatus,
    reload: reloadInvoices,
  } = usePlatformInvoices();
  const [filter, setFilter] = useState("");
  const active = CARDS.find((card) => card.key === filter) || null;
  const visible = useMemo(
    () => invoices.filter((invoice) => matchesInvoiceFilters(invoice, { status: filter })),
    [filter, invoices],
  );
  const pagination = usePagination(visible, LIST_PAGE_SIZE, filter);
  let tableBody;
  if (invoicesLoading) {
    tableBody = (
      <tr>
        <td colSpan={6}><p className="panel-copy" style={{ margin: "8px 0" }}>Loading invoices.</p></td>
      </tr>
    );
  } else if (invoicesError) {
    tableBody = (
      <tr>
        <td colSpan={6}>
          <p className="panel-copy" role="alert" style={{ margin: "8px 0" }}>
            {invoiceListErrorMessage(invoicesError, invoicesErrorStatus)}
          </p>
          <Button variant="secondary" onClick={reloadInvoices}>Try again</Button>
        </td>
      </tr>
    );
  } else if (visible.length === 0) {
    tableBody = (
      <tr>
        <td colSpan={6}>
          <p className="panel-copy" style={{ margin: "8px 0" }}>
            {active ? `No ${active.label.toLowerCase()} invoices.` : "No invoices yet."}
          </p>
        </td>
      </tr>
    );
  } else {
    tableBody = pagination.rows.map((invoice) => {
      const hospitalPath = invoice.tenantId == null ? "" : platformPath(`/hospitals/${invoice.tenantId}`);
      const invoiceLabel = invoice.number || (invoice.id != null ? String(invoice.id) : "—");
      return (
        <tr
          key={invoice.id ?? invoiceLabel}
          className={hospitalPath ? "inv-row-link" : undefined}
          onClick={hospitalPath ? () => navigate(hospitalPath) : undefined}
        >
          <td className="inv-mono">{invoiceLabel}</td>
          <td><HospitalCell invoice={invoice} /></td>
          <td>{formatDate(invoice.invoiceDate)}</td>
          <td>{formatDate(invoice.dueDate)}</td>
          <td className="inv-amount">{formatCurrency(invoiceAmount(invoice))}</td>
          <td><StatusChip status={invoice.status} /></td>
        </tr>
      );
    });
  }

  return (
    <section className="inv-page">
      {revenueError && (
        <div role="alert">
          <p className="panel-copy">{revenueError}</p>
          <Button variant="secondary" onClick={reloadRevenue}>Try again</Button>
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
              <strong className={card.tone}>{revenueLoading && !revenue ? "…" : revenue ? card.value(revenue) : "—"}</strong>
              <small>{revenue ? card.detail(revenue) : card.empty}</small>
            </button>
          );
        })}
      </div>

      <section className="inv-panel">
        <div className="inv-meta">
          <span>
            {invoiceListCountLabel({
              loading: invoicesLoading,
              error: invoicesError,
              total: invoices.length,
              filtered: visible.length,
              filterLabel: active?.label || "",
            })}
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
          <tbody>{tableBody}</tbody>
        </table>
      </div>
      {!invoicesLoading && !invoicesError ? <Pagination {...pagination} onPageChange={pagination.setPage} /> : null}
    </section>
    </section>
  );
}
