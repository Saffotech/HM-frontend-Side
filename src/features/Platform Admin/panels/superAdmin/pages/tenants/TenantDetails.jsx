import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import Button from "../../../../shared/components/Button";
import ConfirmDialog from "../../../../shared/components/ConfirmDialog";
import EmptyState from "../../../../shared/components/EmptyState";
import { usePlatform } from "../../../../shared/context/PlatformContext";
import { useToast } from "../../../../shared/hooks/useToast";
import { PLATFORM_BASE, platformPath } from "../../../../shared/paths";
import { daysUntil, formatDate, formatDateTime } from "../../../../shared/utils/formatDate";
import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import "./TenantDetails.css";

const tabs = ["Overview", "Organization", "Subscription & Billing", "Usage & Limits", "Activity"];

export default function TenantDetails() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { hospitals, invoices, auditLogs, setHospitalStatus } = usePlatform();
  const { push } = useToast();
  const [tab, setTab] = useState(tabs[0]);
  const [confirm, setConfirm] = useState(false);
  const hospital = hospitals.find((item) => item.id === tenantId);

  if (!hospital) {
    return (
      <section className="td-panel td-pad">
        <EmptyState title="Hospital not found" message="This tenant does not exist or was removed." action={<Button onClick={() => navigate(platformPath("/hospitals"))}>Back to hospitals</Button>} />
      </section>
    );
  }

  const activity = auditLogs.filter((entry) => entry.resource === hospital.id || entry.tenant === hospital.name);
  const tenantInvoices = invoices
    .filter((invoice) => invoice.tenantId === hospital.id)
    .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
  const outstanding = tenantInvoices.filter((invoice) => invoice.status !== "Paid").reduce((sum, invoice) => sum + invoice.amount, 0);
  const nextStatus = hospital.status === "Suspended" ? "Active" : "Suspended";
  const storagePercent = percentOf(hospital.storageUsedGb, hospital.storageLimitGb);
  const userPercent = percentOf(hospital.users, hospital.userLimit);
  const renewalDays = daysUntil(hospital.renewalDate);

  return (
    <section className="td-page">
      <button type="button" className="td-back" onClick={() => navigate(platformPath("/hospitals"))}>
        <ArrowLeft size={14} aria-hidden="true" />Back to hospitals
      </button>

      <header className="td-record">
        <div className="td-identity">
          <div className="td-logo" aria-hidden="true">{hospital.name.split(" ").slice(0, 2).map((word) => word[0]).join("")}</div>
          <div>
            <div className="td-title-row">
              <h1>{hospital.name}</h1>
              <Chip value={hospital.status} />
            </div>
            <div className="td-meta">
              <span className="td-mono">{hospital.id}</span>
              <span className="td-mono">{hospital.code}</span>
              <span>{hospital.type}</span>
              <span><MapPin size={12} aria-hidden="true" />{hospital.city}, {hospital.state}</span>
            </div>
          </div>
        </div>
        <div className="td-record-actions">
          <Button variant="secondary" onClick={() => navigate(`${PLATFORM_BASE}/billing/subscriptions?q=${encodeURIComponent(hospital.name)}`)}>View subscription</Button>
          {hospital.status !== "Closed" && (
            <Button variant={hospital.status === "Active" ? "danger" : "primary"} onClick={() => setConfirm(true)}>
              {hospital.status === "Suspended" ? "Reactivate" : "Suspend"}
            </Button>
          )}
        </div>
      </header>

      <div className="td-kpis">
        <Kpi label="Plan" value={hospital.plan} sub={`${hospital.billingCycle} billing`} />
        <Kpi label="Monthly recurring" value={formatCurrency(hospital.monthlyRecurring)} sub={`${formatCurrency(hospital.amount)} per cycle`} />
        <Kpi
          label="Next renewal"
          value={formatDate(hospital.renewalDate)}
          sub={hospital.status === "Closed" ? "Closed" : renewalDays < 0 ? `${Math.abs(renewalDays)} days overdue` : `in ${renewalDays} days`}
          tone={hospital.status !== "Closed" && renewalDays <= 7 ? (renewalDays < 0 ? "late" : "soon") : ""}
        />
        <Kpi label="Users" value={`${hospital.users} / ${hospital.userLimit}`} sub={`${userPercent}% of limit`} tone={usageTone(userPercent)} />
        <Kpi label="Outstanding" value={formatCurrency(outstanding)} sub={`${tenantInvoices.length} invoice${tenantInvoices.length === 1 ? "" : "s"}`} tone={outstanding > 0 ? "soon" : ""} />
      </div>

      <section className="td-panel">
        <nav className="td-tabs" role="tablist" aria-label="Hospital sections">
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              className={`td-tab ${tab === item ? "active" : ""}`}
              onClick={() => setTab(item)}
            >
              {item}
              {item === "Activity" && <span className="td-count">{activity.length}</span>}
            </button>
          ))}
        </nav>

        {tab === "Overview" && (
          <div className="td-body">
            <div className="td-two">
              <Box title="Organization">
                <Info label="Type" value={hospital.type} />
                <Info label="Beds" value={hospital.beds} />
                <Info label="Contact" value={hospital.contactPerson} />
                <Info label="Registered" value={formatDate(hospital.registeredAt)} />
              </Box>
              <Box title="Subscription">
                <Info label="Plan" value={`${hospital.plan} · ${hospital.billingCycle}`} />
                <Info label="Status" value={<Chip value={hospital.subscriptionStatus} />} />
                <Info label="Started" value={formatDate(hospital.startDate)} />
                <Info label="Renews" value={formatDate(hospital.renewalDate)} />
              </Box>
            </div>
            <Box title="Recent invoices" action={<button type="button" className="td-link" onClick={() => setTab("Subscription & Billing")}>View all</button>}>
              <InvoiceTable rows={tenantInvoices.slice(0, 3)} />
            </Box>
            <Box title="Recent activity" action={<button type="button" className="td-link" onClick={() => setTab("Activity")}>View all</button>}>
              <ActivityList rows={activity.slice(0, 4)} />
            </Box>
          </div>
        )}

        {tab === "Organization" && (
          <div className="td-body">
            <div className="td-two">
              <Box title="Hospital">
                <Info label="Legal name" value={hospital.name} />
                <Info label="Tenant code" value={<span className="td-mono">{hospital.code}</span>} />
                <Info label="Type" value={hospital.type} />
                <Info label="Beds" value={hospital.beds} />
                <Info label="Email" value={<IconText icon={Mail} text={hospital.email} />} />
                <Info label="Phone" value={<IconText icon={Phone} text={hospital.phone} />} />
                <Info label="Address" value={`${hospital.address}, ${hospital.city}, ${hospital.state} ${hospital.postalCode}`} />
              </Box>
              <Box title="Administrator">
                <Info label="Name" value={hospital.adminName} />
                <Info label="Email" value={<IconText icon={Mail} text={hospital.adminEmail} />} />
                <Info label="Phone" value={<IconText icon={Phone} text={hospital.adminPhone} />} />
                <Info label="Registered" value={formatDate(hospital.registeredAt)} />
              </Box>
            </div>
          </div>
        )}

        {tab === "Subscription & Billing" && (
          <div className="td-body">
            <Box title="Subscription">
              <div className="td-info-cols">
                <Info label="Plan" value={hospital.plan} />
                <Info label="Status" value={<Chip value={hospital.subscriptionStatus} />} />
                <Info label="Billing cycle" value={hospital.billingCycle} />
                <Info label="Cycle amount" value={formatCurrency(hospital.amount)} />
                <Info label="Monthly value" value={formatCurrency(hospital.monthlyRecurring)} />
                <Info label="Trial" value={hospital.trialPeriod} />
                <Info label="Start date" value={formatDate(hospital.startDate)} />
                <Info label="Renewal date" value={formatDate(hospital.renewalDate)} />
              </div>
            </Box>
            <Box title="Invoices" action={<button type="button" className="td-link" onClick={() => navigate(platformPath("/billing/revenue"))}>Open Billing & Revenue</button>}>
              <InvoiceTable rows={tenantInvoices} />
            </Box>
          </div>
        )}

        {tab === "Usage & Limits" && (
          <div className="td-body">
            <div className="td-usage-grid">
              <UsageCard label="Users" used={hospital.users} limit={hospital.userLimit} unit="" percent={userPercent} />
              <UsageCard label="Storage" used={hospital.storageUsedGb} limit={hospital.storageLimitGb} unit=" GB" percent={storagePercent} />
            </div>
          </div>
        )}

        {tab === "Activity" && (
          <div className="td-body">
            {activity.length === 0 ? (
              <p className="td-empty">No activity recorded for this hospital yet.</p>
            ) : (
              <table className="td-table">
                <thead>
                  <tr><th>Time</th><th>Action</th><th>Performed by</th><th>Result</th></tr>
                </thead>
                <tbody>
                  {activity.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDateTime(entry.timestamp)}</td>
                      <td>{entry.action}</td>
                      <td>{entry.actor}</td>
                      <td><Chip value={entry.result} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirm}
        title={nextStatus === "Suspended" ? `Suspend ${hospital.name}?` : `Reactivate ${hospital.name}?`}
        message={nextStatus === "Suspended"
          ? "Users of this hospital will lose access until it is reactivated. Billing stops while suspended."
          : "Users of this hospital will regain access and billing resumes."}
        confirmLabel={nextStatus === "Suspended" ? "Suspend" : "Reactivate"}
        tone={nextStatus === "Suspended" ? "danger" : "primary"}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setHospitalStatus(hospital.id, nextStatus);
          setConfirm(false);
          push(`${hospital.name} ${nextStatus === "Suspended" ? "suspended" : "reactivated"}.`, "success");
        }}
      />
    </section>
  );
}

function percentOf(used, limit) {
  return limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
}

function usageTone(percent) {
  if (percent >= 95) return "late";
  if (percent >= 80) return "soon";
  return "";
}

const chipTones = {
  Active: "green",
  Paid: "green",
  Success: "green",
  Trial: "blue",
  Pending: "amber",
  Suspended: "amber",
  "Past Due": "red",
  Overdue: "red",
  Failed: "red",
  Closed: "grey",
  Cancelled: "grey",
};

function Chip({ value }) {
  return <span className={`td-chip td-chip-${chipTones[value] || "grey"}`}>{value}</span>;
}

function Kpi({ label, value, sub, tone = "" }) {
  return (
    <div className="td-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
      <small className={tone}>{sub}</small>
    </div>
  );
}

function Box({ title, action, children }) {
  return (
    <section className="td-box">
      <header>
        <h2>{title}</h2>
        {action}
      </header>
      <div className="td-box-body">{children}</div>
    </section>
  );
}

function Info({ label, value }) {
  return (
    <div className="td-info">
      <span>{label}</span>
      <strong>{value ?? "—"}</strong>
    </div>
  );
}

function IconText({ icon: Icon, text }) {
  return <span className="td-icon-text"><Icon size={13} aria-hidden="true" />{text}</span>;
}

function InvoiceTable({ rows }) {
  if (rows.length === 0) return <p className="td-empty">No invoices for this hospital.</p>;
  return (
    <table className="td-table">
      <thead>
        <tr><th>Invoice</th><th>Issued</th><th>Due</th><th className="num">Amount</th><th>Status</th></tr>
      </thead>
      <tbody>
        {rows.map((invoice) => (
          <tr key={invoice.id}>
            <td className="td-mono">{invoice.number}</td>
            <td>{formatDate(invoice.invoiceDate)}</td>
            <td>{formatDate(invoice.dueDate)}</td>
            <td className="num">{formatCurrency(invoice.amount)}</td>
            <td><Chip value={invoice.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ActivityList({ rows }) {
  if (rows.length === 0) return <p className="td-empty">No activity recorded yet.</p>;
  return (
    <ol className="td-activity">
      {rows.map((entry) => (
        <li key={entry.id}>
          <strong>{entry.action}</strong>
          <span>{entry.actor} · {formatDateTime(entry.timestamp)}</span>
        </li>
      ))}
    </ol>
  );
}

function UsageCard({ label, used, limit, unit, percent }) {
  const tone = usageTone(percent);
  return (
    <div className="td-usage">
      <div className="td-usage-head">
        <span>{label}</span>
        <strong className={tone}>{percent}%</strong>
      </div>
      <div className="td-usage-track" aria-hidden="true">
        <div className={`td-usage-fill ${tone}`} style={{ width: `${percent}%` }} />
      </div>
      <div className="td-usage-foot">
        <span>{used.toLocaleString("en-US")}{unit} used</span>
        <span>Limit {limit.toLocaleString("en-US")}{unit}</span>
      </div>
    </div>
  );
}
