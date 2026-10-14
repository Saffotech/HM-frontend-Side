import { Component, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Building2, CalendarClock, CircleDollarSign, PauseCircle, UserPlus } from "lucide-react";
import Badge from "../../../../shared/components/Badge";
import Button from "../../../../shared/components/Button";
import { usePlatform } from "../../../../shared/context/PlatformContext";
import { PLATFORM_BASE, platformPath } from "../../../../shared/paths";
import { daysUntil, formatDate, formatDateTime } from "../../../../shared/utils/formatDate";
import { formatCurrency, formatPercent, percentChange } from "../../../../shared/utils/formatCurrency";
import { activeMrr, registrationSeries, revenueSeries } from "../../utils/metrics";
import { RegistrationChart, RevenueTrendChart } from "./DashboardCharts";
import "./Dashboard.css";

const CHART_PERIOD = "12m";

const STATUS_TONE = {
  Active: "ok",
  Success: "ok",
  Contacted: "ok",
  Suspended: "bad",
  "Past Due": "bad",
  Failed: "bad",
  Overdue: "bad",
  New: "info",
  Trial: "info",
  Closed: "mute",
  Cancelled: "mute",
};

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}/.test(String(value || ""));
}

function monthStartKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}-01`;
}

function totalChangeHint(hospitals) {
  if (!hospitals.every((hospital) => isIsoDate(hospital.registeredAt))) return "";
  const start = monthStartKey(new Date());
  const previous = hospitals.filter((hospital) => hospital.registeredAt.slice(0, 10) < start).length;
  const delta = hospitals.length - previous;
  if (previous === 0) return delta > 0 ? `${delta} registered this month` : "";
  if (delta === 0) return "No change vs last month";
  return `${formatPercent(percentChange(hospitals.length, previous))} vs last month`;
}

function renewalCount(invoices) {
  return invoices.filter((invoice) => {
    if (invoice.status === "Paid") return false;
    const days = daysUntil(invoice.dueDate);
    return days >= 0 && days <= 7;
  }).length;
}

class DashboardBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError() {
    return { error: true };
  }

  render() {
    if (this.state.error) {
      return (
        <section className="dash-page">
          <DashboardError onRetry={() => this.setState({ error: null })} />
        </section>
      );
    }
    return this.props.children;
  }
}

function DashboardError({ onRetry }) {
  return (
    <section className="card card-pad dash-error">
      <h2 className="panel-title">Dashboard data is unavailable</h2>
      <p className="panel-copy">Hospital, billing, or activity records could not be read. Counts stay hidden so this page does not show zeros in their place.</p>
      <Button onClick={onRetry}>Try again</Button>
    </section>
  );
}

function KpiCard({ label, value, hint, icon, to, loading }) {
  if (loading) return <div className="card skeleton dash-kpi" aria-hidden="true" />;
  const body = (
    <>
      <div>
        <span className="dash-kpi-label">{label}</span>
        <strong className="dash-kpi-value">{value}</strong>
        {hint ? <span className="dash-kpi-hint">{hint}</span> : null}
      </div>
      <span className="dash-kpi-icon" aria-hidden="true">{icon}</span>
    </>
  );
  if (!to) return <article className="card dash-kpi">{body}</article>;
  const name = hint ? `${label}: ${value}. ${hint}` : `${label}: ${value}`;
  return (
    <Link className="card dash-kpi" to={to} aria-label={name}>
      {body}
    </Link>
  );
}

function StatusPill({ value }) {
  const tone = STATUS_TONE[value] || "mute";
  return <span className={`dash-status dash-status-${tone}`}>{value || "—"}</span>;
}

function Panel({ title, description, href, linkLabel, children }) {
  return (
    <section className="card card-pad dash-panel">
      <header className="dash-panel-head">
        <div>
          <h2 className="panel-title">{title}</h2>
          <p className="panel-copy">{description}</p>
        </div>
        {href ? <Link to={href}>{linkLabel}</Link> : null}
      </header>
      {children}
    </section>
  );
}

function SimpleTable({ columns, rows, empty }) {
  if (rows.length === 0) return <p className="dash-empty">{empty}</p>;
  return (
    <div className="dash-table-wrap">
      <table className="dash-table">
        <thead>
          <tr>
            {columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DashboardContent() {
  const { hospitals, onboarding, invoices, auditLogs } = usePlatform();
  const [loading, setLoading] = useState(true);
  const ready = [hospitals, onboarding, invoices, auditLogs].every(Array.isArray);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 350);
    return () => window.clearTimeout(timer);
  }, []);

  const view = useMemo(() => {
    if (!ready) return null;
    const closed = hospitals.filter((hospital) => hospital.status === "Closed").length;
    const fresh = onboarding.filter((request) => request.status === "New").length;
    const contacted = onboarding.filter((request) => request.status === "Contacted").length;
    const change = totalChangeHint(hospitals);
    const closedNote = closed > 0 ? `${closed} closed` : "";
    const totalHint = [change, closedNote].filter(Boolean).join(" · ");
    const registrations = [...hospitals]
      .sort((a, b) => String(b.registeredAt).localeCompare(String(a.registeredAt)))
      .slice(0, 4);
    const requests = onboarding
      .filter((request) => request.status === "New" || request.status === "Contacted")
      .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)))
      .slice(0, 4);
    const renewals = hospitals
      .filter((hospital) => hospital.status !== "Closed" && hospital.subscriptionStatus !== "Cancelled" && daysUntil(hospital.renewalDate) >= 0)
      .sort((a, b) => String(a.renewalDate).localeCompare(String(b.renewalDate)))
      .slice(0, 4);
    return {
      total: hospitals.length,
      active: hospitals.filter((hospital) => hospital.status === "Active").length,
      suspended: hospitals.filter((hospital) => hospital.status === "Suspended").length,
      pending: fresh + contacted,
      totalHint,
      onboardingHint: fresh + contacted > 0 ? `${fresh} new, ${contacted} contacted` : "",
      mrr: activeMrr(hospitals),
      renewalsDue: renewalCount(invoices),
      growth: registrationSeries(hospitals, CHART_PERIOD),
      revenue: revenueSeries(invoices, CHART_PERIOD),
      registrations,
      requests,
      renewals,
      activity: auditLogs.slice(0, 5),
    };
  }, [auditLogs, hospitals, invoices, onboarding, ready]);

  const retry = () => {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 350);
  };

  if (!loading && !ready) return <DashboardError onRetry={retry} />;

  return (
    <>
      <h1 className="dash-sr">Dashboard</h1>
      <div className="kpi-grid">
        <KpiCard
          loading={loading}
          label="Total Hospitals"
          value={view?.total}
          hint={view?.totalHint}
          icon={<Building2 size={18} />}
          to={platformPath("/hospitals")}
        />
        <KpiCard
          loading={loading}
          label="Active Hospitals"
          value={view?.active}
          icon={<Activity size={18} />}
        />
        <KpiCard
          loading={loading}
          label="Suspended Hospitals"
          value={view?.suspended}
          icon={<PauseCircle size={18} />}
        />
        <KpiCard
          loading={loading}
          label="Open Onboarding Requests"
          value={view?.pending}
          hint={view?.onboardingHint}
          icon={<UserPlus size={18} />}
          to={platformPath("/crm-performance")}
        />
        <KpiCard
          loading={loading}
          label="Monthly Recurring Revenue"
          value={view ? formatCurrency(view.mrr) : ""}
          hint="Active hospitals only"
          icon={<CircleDollarSign size={18} />}
          to={platformPath("/billing/subscriptions")}
        />
        <KpiCard
          loading={loading}
          label="Renewals Due in 7 Days"
          value={view?.renewalsDue}
          hint="Unpaid invoices due within 7 days"
          icon={<CalendarClock size={18} />}
          to={platformPath("/billing/revenue")}
        />
      </div>

      <div className="chart-grid dash-charts">
        {loading || !view ? (
          <>
            <div className="card skeleton dash-chart-skeleton" aria-hidden="true" />
            <div className="card skeleton dash-chart-skeleton" aria-hidden="true" />
          </>
        ) : (
          <>
            <RegistrationChart data={view.growth} />
            <RevenueTrendChart data={view.revenue} />
          </>
        )}
      </div>

      <div className="dash-ops">
        {loading || !view ? (
          <>
            <div className="card skeleton dash-chart-skeleton" aria-hidden="true" />
            <div className="card skeleton dash-chart-skeleton" aria-hidden="true" />
            <div className="card skeleton dash-chart-skeleton" aria-hidden="true" />
            <div className="card skeleton dash-chart-skeleton" aria-hidden="true" />
          </>
        ) : (
          <>
            <Panel
              title="Recent hospital registrations"
              description="Newest tenants by registration date."
              href={platformPath("/hospitals")}
              linkLabel="View all"
            >
              <SimpleTable
                empty="No hospitals have been registered."
                rows={view.registrations}
                columns={[
                  {
                    key: "name",
                    label: "Hospital",
                    render: (row) => <Link to={`${PLATFORM_BASE}/hospitals/${row.id}`}>{row.name || "—"}</Link>,
                  },
                  { key: "registeredAt", label: "Registered", render: (row) => formatDate(row.registeredAt) },
                  { key: "status", label: "Status", render: (row) => <StatusPill value={row.status} /> },
                  {
                    key: "action",
                    label: "Action",
                    render: (row) => <Link to={`${PLATFORM_BASE}/hospitals/${row.id}`} aria-label={`Open ${row.name || "hospital"}`}>Open</Link>,
                  },
                ]}
              />
            </Panel>
            <Panel
              title="Pending onboarding requests"
              description="Requests still marked New or Contacted."
              href={platformPath("/crm-performance")}
              linkLabel="Review queue"
            >
              <SimpleTable
                empty="No open onboarding requests."
                rows={view.requests}
                columns={[
                  { key: "hospitalName", label: "Hospital", render: (row) => row.hospitalName || "—" },
                  { key: "submittedAt", label: "Submitted", render: (row) => formatDate(row.submittedAt) },
                  { key: "status", label: "Status", render: (row) => <StatusPill value={row.status} /> },
                  {
                    key: "action",
                    label: "Action",
                    render: (row) => <Link to={platformPath("/crm-performance")} aria-label={`Review ${row.hospitalName || "request"}`}>Review</Link>,
                  },
                ]}
              />
            </Panel>
            <Panel
              title="Upcoming subscription renewals"
              description="Next renewal on each open subscription. Closed and cancelled subscriptions are left out."
              href={platformPath("/billing/subscriptions")}
              linkLabel="View subscriptions"
            >
              <SimpleTable
                empty="No upcoming subscription renewals."
                rows={view.renewals}
                columns={[
                  {
                    key: "name",
                    label: "Hospital",
                    render: (row) => <Link to={`${PLATFORM_BASE}/hospitals/${row.id}`}>{row.name || "—"}</Link>,
                  },
                  { key: "plan", label: "Plan", render: (row) => row.plan || "—" },
                  { key: "renewalDate", label: "Renewal", render: (row) => formatDate(row.renewalDate) },
                  { key: "subscriptionStatus", label: "Status", render: (row) => <StatusPill value={row.subscriptionStatus} /> },
                ]}
              />
            </Panel>
            <Panel
              title="Recent platform activity"
              description="Recorded actions, including ones taken in this browser. Demonstration history, not a live audit feed."
            >
              <SimpleTable
                empty="No platform activity yet."
                rows={view.activity}
                columns={[
                  { key: "action", label: "Activity", render: (row) => row.action || "—" },
                  { key: "tenant", label: "Tenant", render: (row) => row.tenant || "—" },
                  { key: "timestamp", label: "When", render: (row) => formatDateTime(row.timestamp) },
                  { key: "result", label: "Status", render: (row) => <Badge>{row.result || "—"}</Badge> },
                ]}
              />
            </Panel>
          </>
        )}
      </div>
    </>
  );
}

export default function Dashboard() {
  return (
    <DashboardBoundary>
      <section className="dash-page">
        <DashboardContent />
      </section>
    </DashboardBoundary>
  );
}
