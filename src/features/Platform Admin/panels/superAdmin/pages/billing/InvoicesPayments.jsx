import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../../shared/components/Button";
import DataTable from "../../../../shared/components/DataTable";
import Input from "../../../../shared/components/Input";
import Modal from "../../../../shared/components/Modal";
import Pagination from "../../../../shared/components/Pagination";
import SearchBar from "../../../../shared/components/SearchBar";
import Select from "../../../../shared/components/Select";
import { usePlatform } from "../../../../shared/context/PlatformContext";
import { usePagination } from "../../../../shared/hooks/usePagination";
import { useToast } from "../../../../shared/hooks/useToast";
import { PLATFORM_BASE } from "../../../../shared/paths";
import { daysUntil, formatDate, formatDateTime, todayInput } from "../../../../shared/utils/formatDate";
import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { PAYMENT_METHODS, UNPAID, isUnpaid, paymentErrors } from "../../../../shared/utils/invoices";
import { includesQuery, sortRows } from "../../../../shared/utils/table";
import "./InvoicesPayments.css";

const STATUSES = ["Paid", "Pending", "Overdue", "Failed"];
const DUE_SOON = "Due in 7 days";

const isDueSoon = (invoice) => {
  if (!isUnpaid(invoice)) return false;
  const days = daysUntil(invoice.dueDate);
  return days >= 0 && days <= 7;
};

export default function InvoicesPayments() {
  const navigate = useNavigate();
  const { invoices, settings, recordInvoicePayment, sendInvoiceReminder } = usePlatform();
  const { push } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [method, setMethod] = useState("All");
  const [payErrors, setPayErrors] = useState({});
  const today = todayInput();
  const [sortKey, setSortKey] = useState("invoiceDate");
  const [sortDirection, setSortDirection] = useState("desc");
  const [previewId, setPreviewId] = useState(null);
  const [payId, setPayId] = useState(null);
  const [payForm, setPayForm] = useState({ amount: "", method: "Bank transfer", reference: "", paidAt: todayInput(), notes: "" });
  const [payError, setPayError] = useState("");

  const preview = invoices.find((item) => item.id === previewId) || null;
  const paying = invoices.find((item) => item.id === payId) || null;

  const summary = useMemo(() => {
    const sum = (list) => list.reduce((total, item) => total + item.amount, 0);
    const byStatus = (value) => invoices.filter((item) => item.status === value);
    const dueSoon = invoices.filter(isDueSoon);
    return {
      dueSoon: sum(dueSoon),
      dueSoonCount: dueSoon.length,
      collected: sum(byStatus("Paid")),
      paidCount: byStatus("Paid").length,
      pending: sum(byStatus("Pending")),
      pendingCount: byStatus("Pending").length,
      overdue: sum(byStatus("Overdue")),
      overdueCount: byStatus("Overdue").length,
      failed: sum(byStatus("Failed")),
      failedCount: byStatus("Failed").length,
    };
  }, [invoices]);

  const rows = useMemo(() => sortRows(
    invoices.filter((invoice) => (
      (status === "All" || (status === DUE_SOON ? isDueSoon(invoice) : invoice.status === status))
      && (method === "All" || invoice.method === method)
      && includesQuery([invoice.number, invoice.tenant, invoice.method, invoice.plan], search)
    )),
    sortKey,
    sortDirection,
  ), [invoices, method, search, sortDirection, sortKey, status]);
  const pagination = usePagination(rows, 10, `${search}|${status}|${method}|${sortKey}|${sortDirection}`);

  const openPay = (invoice) => {
    setPayId(invoice.id);
    setPayForm({ amount: String(invoice.amount), method: invoice.method || "Bank transfer", reference: "", paidAt: today, notes: "" });
    setPayError("");
    setPayErrors({});
  };

  const savePayment = () => {
    const next = paymentErrors(payForm);
    setPayErrors(next);
    setPayError(next.reference || "");
    if (Object.keys(next).length) return;
    recordInvoicePayment(paying.id, {
      amount: Number(payForm.amount),
      method: payForm.method,
      reference: payForm.reference.trim(),
      paidAt: payForm.paidAt,
      notes: payForm.notes.trim(),
    });
    push(`Payment recorded for ${paying.number}.`, "success");
    setPayId(null);
  };

  const remind = (invoice) => {
    sendInvoiceReminder(invoice.id);
    push("Payment reminder sent.", "success");
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("All");
    setMethod("All");
  };

  const invoiceColumns = [
    { key: "number", label: "Invoice", sortable: true, render: (row) => <span className="inv-mono">{row.number}</span> },
    {
      key: "tenant",
      label: "Tenant",
      sortable: true,
      render: (row) => (
        <>
          <span className="inv-name">{row.tenant}</span>
          <span className="inv-sub">{row.plan} · {row.cycle}</span>
        </>
      ),
    },
    { key: "invoiceDate", label: "Issued", sortable: true, render: (row) => formatDate(row.invoiceDate) },
    { key: "dueDate", label: "Due", sortable: true, render: (row) => <DueDate invoice={row} /> },
    { key: "amount", label: "Amount", sortable: true, render: (row) => <span className="inv-amount">{formatCurrency(row.amount)}</span> },
    { key: "status", label: "Status", sortable: true, render: (row) => <StatusChip status={row.status} /> },
    { key: "method", label: "Method", sortable: true },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="inv-actions">
          <button type="button" className="action-link" onClick={() => setPreviewId(row.id)}>View</button>
        </div>
      ),
    },
  ];

  return (
    <section className="inv-page">
      <div className="inv-summary no-print">
        <SummaryCell label="Collected" amount={summary.collected} count={summary.paidCount} tone="paid" selected={status === "Paid"} onClick={() => setStatus("Paid")} />
        <SummaryCell label="Pending" amount={summary.pending} count={summary.pendingCount} tone="pending" selected={status === "Pending"} onClick={() => setStatus("Pending")} />
        <SummaryCell label="Overdue" amount={summary.overdue} count={summary.overdueCount} tone="overdue" selected={status === "Overdue"} onClick={() => setStatus("Overdue")} />
        <SummaryCell label="Failed" amount={summary.failed} count={summary.failedCount} tone="failed" selected={status === "Failed"} onClick={() => setStatus("Failed")} />
        <SummaryCell label="Renewal due in 7 days" amount={summary.dueSoon} count={summary.dueSoonCount} tone="soon" selected={status === DUE_SOON} onClick={() => setStatus(DUE_SOON)} />
      </div>

      <section className="inv-panel no-print">
        <div className="inv-toolbar">
          <SearchBar value={search} onChange={setSearch} placeholder="Search invoice number, hospital, or plan" />
          <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option>All</option>
            {STATUSES.map((item) => <option key={item}>{item}</option>)}
            <option>{DUE_SOON}</option>
          </Select>
          <Select label="Method" value={method} onChange={(event) => setMethod(event.target.value)}>
            <option>All</option>
            {PAYMENT_METHODS.map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Button variant="secondary" onClick={resetFilters}>Reset</Button>
        </div>
        <div className="inv-meta">
          <span>{rows.length} invoice{rows.length === 1 ? "" : "s"}</span>
          <span>Total {formatCurrency(rows.reduce((total, item) => total + item.amount, 0))}</span>
        </div>
        <DataTable
          rows={pagination.rows}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={(key) => {
            if (sortKey === key) setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
            else { setSortKey(key); setSortDirection("asc"); }
          }}
          emptyTitle={search.trim() ? "No invoices match your search." : "No invoices"}
          emptyMessage={search.trim() ? "Try a hospital name, invoice number, or plan." : "No invoices match these filters."}
          columns={invoiceColumns}
        />
        <Pagination {...pagination} onPageChange={pagination.setPage} />
      </section>

      <Modal
        open={Boolean(preview)}
        title={preview?.number || "Invoice"}
        subtitle={preview ? preview.tenant : ""}
        onClose={() => setPreviewId(null)}
        size="lg"
        footer={preview && (
          <div className="no-print inv-modal-footer">
            <Button variant="secondary" onClick={() => setPreviewId(null)}>Close</Button>
            <Button variant="secondary" onClick={() => navigate(`${PLATFORM_BASE}/hospitals/${preview.tenantId}`)}>Open hospital</Button>
            {(preview.status === "Pending" || preview.status === "Overdue") && (
              <Button variant="secondary" onClick={() => remind(preview)}>Send reminder</Button>
            )}
            {UNPAID.includes(preview.status) && (
              <Button onClick={() => { setPreviewId(null); openPay(preview); }}>{preview.status === "Failed" ? "Retry" : "Record payment"}</Button>
            )}
          </div>
        )}
      >
        {preview && (
          <article className="invoice-sheet">
            <header className="invoice-top">
              <div>
                <strong className="invoice-brand">{settings.brandName}</strong>
                <span>{settings.supportEmail}</span>
                <span>{settings.website}</span>
              </div>
              <div className="invoice-title">
                <h3>INVOICE</h3>
                <span className="inv-mono">{preview.number}</span>
                <StatusChip status={preview.status} />
              </div>
            </header>

            <div className="invoice-parties">
              <div>
                <span className="invoice-label">Bill to</span>
                <strong>{preview.tenant}</strong>
                <span className="inv-mono">{preview.tenantId}</span>
              </div>
              <dl>
                <div><dt>Issued</dt><dd>{formatDate(preview.invoiceDate)}</dd></div>
                <div><dt>Due</dt><dd>{formatDate(preview.dueDate)}</dd></div>
                <div><dt>Method</dt><dd>{preview.method}</dd></div>
              </dl>
            </div>

            <table className="invoice-lines">
              <thead>
                <tr><th>Description</th><th>Period</th><th className="num">Amount</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>{preview.plan} plan subscription</td>
                  <td>{preview.cycle}</td>
                  <td className="num">{formatCurrency(preview.amount)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr><td colSpan={2}>Total due</td><td className="num">{formatCurrency(preview.amount)}</td></tr>
              </tfoot>
            </table>

            {(preview.paidAt || preview.lastReminderAt) && (
              <div className="invoice-log">
                {preview.paidAt && (
                  <span>Paid on {formatDate(preview.paidAt)}{preview.reference ? ` · Ref ${preview.reference}` : ""}{preview.recordedBy ? ` · Recorded by ${preview.recordedBy}` : ""}</span>
                )}
                {preview.lastReminderAt && <span>Last reminder sent {formatDateTime(preview.lastReminderAt)}</span>}
              </div>
            )}
          </article>
        )}
      </Modal>

      <Modal
        open={Boolean(paying)}
        title="Record payment"
        subtitle={paying ? `${paying.number} · ${paying.tenant} · ${formatCurrency(paying.amount)}` : ""}
        onClose={() => setPayId(null)}
        footer={<><Button variant="secondary" onClick={() => setPayId(null)}>Cancel</Button><Button onClick={savePayment}>Record payment</Button></>}
      >
        {paying && (
          <dl className="inv-detail">
            <div><dt>Hospital</dt><dd>{paying.tenant}</dd></div>
            <div><dt>Invoice</dt><dd>{paying.number}</dd></div>
            <div><dt>Amount due</dt><dd>{formatCurrency(paying.amount)}</dd></div>
            <div><dt>Due date</dt><dd>{formatDate(paying.dueDate)}</dd></div>
          </dl>
        )}
        <div className="inv-form">
          <Input label="Payment amount *" type="number" min="1" value={payForm.amount} error={payErrors.amount} onChange={(event) => { setPayForm({ ...payForm, amount: event.target.value }); setPayErrors({ ...payErrors, amount: "" }); }} />
          <Select label="Payment method *" value={payForm.method} error={payErrors.method} onChange={(event) => setPayForm({ ...payForm, method: event.target.value })}>
            {PAYMENT_METHODS.map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Input
            type="date"
            label="Payment date *"
            value={payForm.paidAt}
            max={today}
            error={payErrors.paidAt}
            onChange={(event) => { setPayForm({ ...payForm, paidAt: event.target.value }); setPayErrors({ ...payErrors, paidAt: "" }); }}
          />
          <Input
            label={payForm.method === "Card" ? "Payment reference" : "Payment reference *"}
            value={payForm.reference}
            error={payErrors.reference || payError}
            onChange={(event) => { setPayForm({ ...payForm, reference: event.target.value }); setPayError(""); setPayErrors({ ...payErrors, reference: "" }); }}
          />
          <Input className="inv-span-2" label="Notes" value={payForm.notes} onChange={(event) => setPayForm({ ...payForm, notes: event.target.value })} />
        </div>
      </Modal>
    </section>
  );
}

function SummaryCell({ label, amount, count, tone, selected, onClick }) {
  return (
    <button type="button" className={`inv-summary-item ${selected ? "selected" : ""}`} onClick={onClick}>
      <span>{label}</span>
      <strong className={`tone-${tone}`}>{formatCurrency(amount)}</strong>
      <small>{count} invoice{count === 1 ? "" : "s"}</small>
    </button>
  );
}

function StatusChip({ status }) {
  const tone = { Paid: "paid", Pending: "pending", Overdue: "overdue", Failed: "failed" }[status] || "pending";
  return <span className={`inv-chip inv-chip-${tone}`}>{status}</span>;
}

function DueDate({ invoice }) {
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
