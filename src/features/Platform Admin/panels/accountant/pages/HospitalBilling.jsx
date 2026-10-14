import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import DataTable from "../../../shared/components/DataTable";
import { usePlatform } from "../../../shared/context/PlatformContext";
import { accountsPath } from "../../../shared/paths";
import { daysUntil, formatDate, formatDateTime } from "../../../shared/utils/formatDate";
import { formatCurrency } from "../../../shared/utils/formatCurrency";
import { isUnpaid, subscriptionIdFromTenant } from "../../../shared/utils/invoices";
import { DueDate, InfoBox, InfoRow, StatusChip } from "../components/InvoiceParts";
import "../Accountant.css";
import "./InvoicesPayments.css";
import "./HospitalBilling.css";

export default function HospitalBilling() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hospitals, invoices } = usePlatform();
  const hospital = hospitals.find((item) => item.id === id);
  const backLink = (
    <Link to={accountsPath("/invoices")} className="hb-back">
      <ArrowLeft size={14} aria-hidden="true" />
      Invoices & Payments
    </Link>
  );

  if (!hospital) {
    return (
      <section className="inv-page hb-page">
        {backLink}
        <div className="inv-panel hb-missing">
          <strong>Hospital not found.</strong>
          <span>It may have been removed. Go back to the invoices list.</span>
        </div>
      </section>
    );
  }

  const subscriptionId = hospital.subscriptionId || subscriptionIdFromTenant(hospital.id);
  const history = invoices
    .filter((invoice) => invoice.tenantId === hospital.id)
    .sort((a, b) => String(b.invoiceDate).localeCompare(String(a.invoiceDate)));
  const unpaid = history.filter(isUnpaid);
  const paid = history.filter((invoice) => invoice.status === "Paid");
  const outstanding = unpaid.reduce((total, invoice) => total + invoice.amount, 0);
  const collected = paid.reduce((total, invoice) => total + (invoice.paymentAmount || invoice.amount), 0);
  const hasOverdue = unpaid.some((invoice) => invoice.status === "Overdue" || daysUntil(invoice.dueDate) < 0);
  const renewalDays = daysUntil(hospital.renewalDate);
  const closed = hospital.status === "Closed";
  const address = [hospital.address, hospital.city, hospital.state, hospital.postalCode].filter(Boolean).join(", ");

  const columns = [
    { key: "number", label: "Invoice", render: (row) => <span className="inv-mono">{row.number}</span> },
    { key: "invoiceDate", label: "Issued", render: (row) => formatDate(row.invoiceDate) },
    { key: "dueDate", label: "Due", render: (row) => <DueDate invoice={row} /> },
    { key: "amount", label: "Amount", render: (row) => <span className="inv-amount">{formatCurrency(row.amount)}</span> },
    { key: "status", label: "Status", render: (row) => <StatusChip status={row.status} /> },
    {
      key: "payment",
      label: "Payment",
      render: (row) => row.status === "Paid" ? (
        <>
          <span className="inv-name">{row.method || "—"}</span>
          <span className="inv-sub">{[row.paidAt && `Paid ${formatDate(row.paidAt)}`, row.reference].filter(Boolean).join(" · ") || "Payment recorded"}</span>
        </>
      ) : (
        <span className="inv-sub">{lastReminder(row) ? `Reminded ${formatDateTime(lastReminder(row).at)}` : "Not received"}</span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="inv-actions">
          <button type="button" className="action-link" onClick={() => navigate(accountsPath("/invoices"), { state: { previewId: row.id } })}>View</button>
        </div>
      ),
    },
  ];

  return (
    <section className="inv-page hb-page">
      {backLink}

      <header className="hb-hero">
        <div>
          <h1>{hospital.name}</h1>
          <p>
            <span className="inv-mono">{hospital.code}</span>
            <span>{hospital.type}</span>
            <span>{[hospital.city, hospital.state].filter(Boolean).join(", ")}</span>
          </p>
        </div>
        <div className="hb-hero-tags">
          <span className={`hb-tag hb-tag-${tone(hospital.status)}`}>Hospital: {hospital.status}</span>
          <span className={`hb-tag hb-tag-${tone(hospital.subscriptionStatus)}`}>Subscription: {hospital.subscriptionStatus}</span>
        </div>
      </header>

      <div className="hb-kpis">
        <Kpi
          label="Outstanding"
          value={formatCurrency(outstanding)}
          hint={unpaid.length ? `${unpaid.length} unpaid invoice${unpaid.length === 1 ? "" : "s"}` : "Nothing due"}
          tone={hasOverdue ? "late" : unpaid.length ? "soon" : "ok"}
        />
        <Kpi label="Collected" value={formatCurrency(collected)} hint={`${paid.length} paid invoice${paid.length === 1 ? "" : "s"}`} />
        <Kpi label="Cycle amount" value={formatCurrency(hospital.amount)} hint={`${hospital.plan} · ${hospital.billingCycle}`} />
        <Kpi
          label="Next renewal"
          value={formatDate(hospital.renewalDate)}
          hint={closed ? "Closed" : renewalDays < 0 ? `${Math.abs(renewalDays)} days overdue` : renewalDays === 0 ? "Today" : `in ${renewalDays} days`}
          tone={!closed && renewalDays < 0 ? "late" : !closed && renewalDays <= 7 ? "soon" : ""}
        />
      </div>

      <div className="inv-view-grid">
        <InfoBox title="Billing contact">
          <InfoRow label="Contact person" value={hospital.contactPerson || hospital.adminName} />
          <InfoRow label="Admin email" value={hospital.adminEmail} />
          <InfoRow label="Admin phone" value={hospital.adminPhone} />
          <InfoRow label="Hospital email" value={hospital.email} />
          <InfoRow label="Hospital phone" value={hospital.phone} />
          <InfoRow label="Address" value={address} />
        </InfoBox>
        <InfoBox title="Subscription">
          <InfoRow label="Subscription ID" value={<span className="inv-mono">{subscriptionId}</span>} />
          <InfoRow label="Plan" value={hospital.plan} />
          <InfoRow label="Billing cycle" value={hospital.billingCycle} />
          <InfoRow label="Monthly recurring" value={formatCurrency(hospital.monthlyRecurring)} />
          <InfoRow label="Start date" value={formatDate(hospital.startDate || hospital.registeredAt)} />
          <InfoRow label="Trial period" value={hospital.trialPeriod} />
        </InfoBox>
      </div>

      <section className="inv-panel">
        <div className="hb-panel-head">
          <h2>Invoice history</h2>
          <span>{history.length} invoice{history.length === 1 ? "" : "s"} · Total {formatCurrency(history.reduce((total, item) => total + item.amount, 0))}</span>
        </div>
        <DataTable
          rows={history}
          columns={columns}
          emptyTitle="No invoices yet"
          emptyMessage="Invoices for this hospital will appear here."
        />
      </section>
    </section>
  );
}

function Kpi({ label, value, hint, tone = "" }) {
  return (
    <article className="hb-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
      <small className={tone}>{hint}</small>
    </article>
  );
}

function tone(status) {
  if (["Active", "Paid"].includes(status)) return "ok";
  if (["Trial"].includes(status)) return "info";
  if (["Past Due", "Suspended"].includes(status)) return "warn";
  if (["Closed", "Cancelled"].includes(status)) return "muted";
  return "info";
}

function lastReminder(invoice) {
  const reminders = invoice.reminders || [];
  return reminders.length ? reminders[reminders.length - 1] : null;
}
