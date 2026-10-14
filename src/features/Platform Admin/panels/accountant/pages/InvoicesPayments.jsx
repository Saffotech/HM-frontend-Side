import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BellRing, Wallet } from "lucide-react";
import Button from "../../../shared/components/Button";
import DataTable from "../../../shared/components/DataTable";
import Input from "../../../shared/components/Input";
import Modal from "../../../shared/components/Modal";
import Pagination from "../../../shared/components/Pagination";
import SearchBar from "../../../shared/components/SearchBar";
import Select from "../../../shared/components/Select";
import { usePlatform } from "../../../shared/context/PlatformContext";
import { accountsPath } from "../../../shared/paths";
import { usePagination } from "../../../shared/hooks/usePagination";
import { useToast } from "../../../shared/hooks/useToast";
import { daysUntil, formatDate, formatDateTime, todayInput } from "../../../shared/utils/formatDate";
import { formatCurrency } from "../../../shared/utils/formatCurrency";
import { PAYMENT_METHODS, UNPAID, billingFor, paymentErrors } from "../../../shared/utils/invoices";
import { includesQuery, sortRows } from "../../../shared/utils/table";
import { DueDate, InfoBox, InfoRow, StatusChip } from "../components/InvoiceParts";
import "../Accountant.css";
import "./InvoicesPayments.css";

const STATUSES = ["Paid", "Pending", "Overdue", "Failed"];
const DATE_FILTERS = ["All", "Due today", "This month"];

export default function InvoicesPayments() {
  const { invoices, hospitals, recordInvoicePayment, sendInvoiceReminder } = usePlatform();
  const { push } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [payErrors, setPayErrors] = useState({});
  const today = todayInput();
  const [sortKey, setSortKey] = useState("invoiceDate");
  const [sortDirection, setSortDirection] = useState("desc");
  const [previewId, setPreviewId] = useState(() => location.state?.previewId || null);
  const [payId, setPayId] = useState(null);
  const [payForm, setPayForm] = useState({ amount: "", method: "Bank transfer", reference: "", paidAt: todayInput(), notes: "" });
  const [payError, setPayError] = useState("");

  const preview = invoices.find((item) => item.id === previewId) || null;
  const paying = invoices.find((item) => item.id === payId) || null;

  const rows = useMemo(() => sortRows(
    invoices.filter((invoice) => {
      const matchesDate = dateFilter === "All"
        || (dateFilter === "Due today" && invoice.dueDate === today)
        || (dateFilter === "This month" && String(invoice.dueDate).slice(0, 7) === today.slice(0, 7));
      return (status === "All" || invoice.status === status)
        && matchesDate
        && includesQuery([invoice.number, invoice.tenant, invoice.method, invoice.plan], search);
    }),
    sortKey,
    sortDirection,
  ), [dateFilter, invoices, search, sortDirection, sortKey, status, today]);
  const pagination = usePagination(rows, 10, `${search}|${status}|${dateFilter}|${sortKey}|${sortDirection}`);

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
    setDateFilter("All");
  };

  const invoiceColumns = [
    { key: "number", label: "Invoice", sortable: true, render: (row) => <span className="inv-mono">{row.number}</span> },
    {
      key: "tenant",
      label: "Hospital",
      sortable: true,
      render: (row) => {
        const subscription = billingFor(row, hospitals);
        return (
          <>
            <span className="inv-name">{subscription.hospitalName}</span>
            <span className="inv-sub">{subscription.plan} · {subscription.cycle} · {subscription.subscriptionStatus}</span>
          </>
        );
      },
    },
    { key: "invoiceDate", label: "Issued", sortable: true, render: (row) => formatDate(row.invoiceDate) },
    { key: "dueDate", label: "Due", sortable: true, render: (row) => <DueDate invoice={row} /> },
    { key: "amount", label: "Amount", sortable: true, render: (row) => <span className="inv-amount">{formatCurrency(row.amount)}</span> },
    { key: "status", label: "Status", sortable: true, render: (row) => <StatusChip status={row.status} /> },
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

  const billing = preview ? billingFor(preview, hospitals) : null;

  return (
    <section className="inv-page">
      <section className="inv-panel">
        <div className="inv-toolbar">
          <SearchBar value={search} onChange={setSearch} placeholder="Search invoice number, hospital, or plan" />
          <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option>All</option>
            {STATUSES.map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
            {DATE_FILTERS.map((item) => <option key={item}>{item}</option>)}
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
        subtitle={billing ? billing.hospitalName : ""}
        onClose={() => setPreviewId(null)}
        size="lg"
        footer={preview && (
          <div className="inv-modal-footer">
            <Button variant="secondary" onClick={() => setPreviewId(null)}>Close</Button>
            {billing.linked && (
              <Button variant="secondary" onClick={() => navigate(accountsPath(`/hospitals/${preview.tenantId}`))}>Open hospital</Button>
            )}
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
          <div className="inv-view">
            <section className={`inv-hero inv-hero-${preview.status.toLowerCase()}`}>
              <div>
                <span className="inv-hero-label">{preview.status === "Paid" ? "Amount paid" : "Amount due"}</span>
                <strong className="inv-hero-amount">{formatCurrency(preview.status === "Paid" ? preview.paymentAmount || preview.amount : preview.amount)}</strong>
                <span className="inv-hero-sub">{billing.plan} plan · {billing.cycle}</span>
              </div>
              <div className="inv-hero-side">
                <StatusChip status={preview.status} />
                <DueSummary invoice={preview} />
              </div>
            </section>

            <div className="inv-view-grid">
              <InfoBox title="Billing">
                <InfoRow label="Hospital" value={billing.hospitalName} />
                <InfoRow label="Plan" value={billing.plan} />
                <InfoRow label="Billing cycle" value={billing.cycle} />
                <InfoRow label="Subscription" value={billing.subscriptionStatus} />
              </InfoBox>
              <InfoBox title="Invoice">
                <InfoRow label="Invoice no." value={<span className="inv-mono">{preview.number}</span>} />
                <InfoRow label="Amount" value={formatCurrency(preview.amount)} />
                <InfoRow label="Issued" value={formatDate(preview.invoiceDate)} />
                <InfoRow label="Due date" value={formatDate(preview.dueDate)} />
              </InfoBox>
            </div>

            <InfoBox title="Payment">
              {preview.status === "Paid" ? (
                <>
                  <InfoRow label="Amount received" value={formatCurrency(preview.paymentAmount || preview.amount)} />
                  <InfoRow label="Method" value={preview.method} />
                  {preview.reference && <InfoRow label="Reference" value={preview.reference} />}
                  {preview.paidAt && <InfoRow label="Paid on" value={formatDate(preview.paidAt)} />}
                  {preview.recordedBy && <InfoRow label="Recorded by" value={preview.recordedBy} />}
                </>
              ) : (
                <p className="inv-view-empty"><Wallet size={16} aria-hidden="true" />No payment received yet.</p>
              )}
              {(preview.reminders || []).length > 0 && (
                <p className="inv-view-reminder">
                  <BellRing size={14} aria-hidden="true" />
                  Last reminder sent {formatDateTime(preview.reminders[preview.reminders.length - 1].at)} by {preview.reminders[preview.reminders.length - 1].by}
                </p>
              )}
            </InfoBox>
          </div>
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
          <InfoBox title="Invoice" className="inv-pay-summary">
            <InfoRow label="Hospital" value={billingFor(paying, hospitals).hospitalName} />
            <InfoRow label="Invoice no." value={<span className="inv-mono">{paying.number}</span>} />
            <InfoRow label="Amount due" value={formatCurrency(paying.amount)} />
            <InfoRow label="Due date" value={formatDate(paying.dueDate)} />
          </InfoBox>
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

function DueSummary({ invoice }) {
  if (invoice.status === "Paid") {
    return <span className="inv-hero-due">{invoice.paidAt ? `Paid on ${formatDate(invoice.paidAt)}` : `Due ${formatDate(invoice.dueDate)}`}</span>;
  }
  const days = daysUntil(invoice.dueDate);
  let hint = `due in ${days} day${days === 1 ? "" : "s"}`;
  let tone = "";
  if (days < 0) { hint = `${Math.abs(days)} day${days === -1 ? "" : "s"} late`; tone = "late"; }
  else if (days === 0) { hint = "due today"; tone = "soon"; }
  else if (days <= 7) tone = "soon";
  return (
    <span className="inv-hero-due">
      Due {formatDate(invoice.dueDate)} · <strong className={tone}>{hint}</strong>
    </span>
  );
}
