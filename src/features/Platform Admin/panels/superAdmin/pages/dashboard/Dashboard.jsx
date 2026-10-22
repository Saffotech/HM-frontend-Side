import { useMemo, useState } from "react";
import { Building2, CalendarPlus, CreditCard, IndianRupee, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../../../shared/components/Button";
import EmptyState from "../../../../shared/components/EmptyState";
import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { formatDate, formatDateTime } from "../../../../shared/utils/formatDate";
import { PLATFORM_BASE } from "../../../../shared/paths";
import { planSlices, registrationsThisMonth } from "../../sessionHospitals";
import { useRegisteredHospitals } from "../../useRegisteredHospitals";
import PlanChart from "../../components/charts/PlanChart";
import TenantGrowthChart from "../../components/charts/TenantGrowthChart";
import { RevenueTrendChart } from "./DashboardCharts";
import { registrationGrowth } from "./dashboardData";
import "./Dashboard.css";

const CARDS = [
  { key: "hospitals", label: "Hospitals", hint: "Registered on the server", icon: Building2 },
  { key: "registrations", label: "New Registration", hint: "Registered this month", icon: CalendarPlus },
  { key: "subscriptions", label: "Subscription", hint: "Active subscriptions", icon: Users },
  { key: "invoices", label: "Invoice", hint: "Unavailable to this portal", icon: CreditCard },
  { key: "revenue", label: "Revenue", hint: "Unavailable to this portal", icon: IndianRupee },
];

function statusClass(status) {
  const value = String(status || "").toLowerCase();
  if (value === "active" || value === "paid") return "dash-status dash-status-ok";
  if (value === "suspended" || value === "failed" || value === "overdue") return "dash-status dash-status-bad";
  if (value === "trial" || value === "pending") return "dash-status dash-status-info";
  return "dash-status dash-status-mute";
}

function hospitalName(hospital) {
  return <Link to={`${PLATFORM_BASE}/hospitals/${hospital.tenant_id}`}>{hospital.name || "Hospital"}</Link>;
}

function DashboardChartState({ title, loading, error, empty, emptyTitle, emptyMessage, children }) {
  if (loading || error || empty) {
    return (
      <section className="card card-pad chart-card dash-chart-state">
        <h2>{title}</h2>
        {loading ? (
          <p className="panel-copy" role="status">Loading chart data…</p>
        ) : error ? (
          <p className="panel-copy" role="alert">{error}</p>
        ) : (
          <EmptyState title={emptyTitle} message={emptyMessage} />
        )}
      </section>
    );
  }
  return children;
}

function DashboardRows({ type, rows, onOpenHospital }) {
  if (type === "hospitals" || type === "registrations") {
    return rows.map((hospital) => (
      <tr
        key={hospital.tenant_id}
        className="dash-clickable-row"
        tabIndex={0}
        aria-label={`Open ${hospital.name || "hospital"}`}
        onClick={(event) => {
          if (!event.target.closest("a, button")) onOpenHospital(hospital);
        }}
        onKeyDown={(event) => {
          if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            onOpenHospital(hospital);
          }
        }}
      >
        <td>{hospitalName(hospital)}</td>
        <td>{hospital.admin_email || "—"}</td>
        {type === "registrations" && <td>{formatDate(hospital.created_at || hospital.rememberedAt)}</td>}
        <td>{hospital.plan || "—"}</td>
        <td><span className={statusClass(hospital.subscription_status || hospital.tenant_status)}>{hospital.subscription_status || hospital.tenant_status || "—"}</span></td>
      </tr>
    ));
  }

  if (type === "subscriptions") {
    return rows.map((hospital) => (
      <tr
        key={hospital.tenant_id}
        className="dash-clickable-row"
        tabIndex={0}
        aria-label={`Open ${hospital.name || "hospital"}`}
        onClick={(event) => {
          if (!event.target.closest("a, button")) onOpenHospital(hospital);
        }}
        onKeyDown={(event) => {
          if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            onOpenHospital(hospital);
          }
        }}
      >
        <td>{hospitalName(hospital)}</td>
        <td>{hospital.plan || "—"}</td>
        <td>{hospital.billing_cycle || "—"}</td>
        <td><span className={statusClass(hospital.subscription_status)}>{hospital.subscription_status || "—"}</span></td>
        <td>{formatDate(hospital.subscription_renews_on)}</td>
      </tr>
    ));
  }

  if (type === "revenue") {
    return rows.map((invoice) => (
      <tr key={invoice.id}>
        <td>{invoice.number || "—"}</td>
        <td>{invoice.hospitalName || "Hospital"}</td>
        <td>{formatDate(invoice.paidAt)}</td>
        <td>{formatCurrency(invoice.paymentAmount ?? invoice.amount)}</td>
        <td>{invoice.method || "—"}</td>
      </tr>
    ));
  }

  return rows.map((invoice) => (
    <tr key={invoice.id}>
      <td>{invoice.number || "—"}</td>
      <td>{invoice.hospitalName || "Hospital"}</td>
      <td>{formatDate(invoice.dueDate)}</td>
      <td>{formatCurrency(invoice.amount)}</td>
      <td><span className={statusClass(invoice.status)}>{invoice.status || "—"}</span></td>
    </tr>
  ));
}

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    hospitals,
    loading: hospitalsLoading,
    refreshing,
    error: hospitalsError,
    refreshError,
    updatedAt,
    reload,
  } = useRegisteredHospitals();
  const [selected, setSelected] = useState("hospitals");
  const hospitalsBusy = hospitalsLoading || refreshing;
  const hospitalError = refreshError || hospitalsError;
  const now = useMemo(() => new Date(), []);
  const registrations = useMemo(
    () => hospitals.filter((hospital) => {
      const created = new Date(hospital.created_at || hospital.rememberedAt || "");
      return !Number.isNaN(created.getTime())
        && created.getMonth() === now.getMonth()
        && created.getFullYear() === now.getFullYear();
    }),
    [hospitals, now],
  );
  const subscriptions = useMemo(
    () => hospitals.filter((hospital) => String(hospital.subscription_status || "").toLowerCase() === "active"),
    [hospitals],
  );
  const growth = useMemo(() => registrationGrowth(hospitals, { now }), [hospitals, now]);
  const plans = useMemo(() => planSlices(hospitals), [hospitals]);

  const metric = (key) => {
    if (key === "invoices" || key === "revenue") return "—";
    if (hospitalsBusy) return "…";
    if (hospitalError) return "—";
    if (key === "hospitals") return hospitals.length;
    if (key === "registrations") return registrationsThisMonth(hospitals);
    return subscriptions.length;
  };

  const table = useMemo(() => {
    if (selected === "hospitals") return {
      title: "Hospitals",
      description: "Registered hospitals on the platform.",
      headers: ["Hospital", "Admin email", "Plan", "Status"],
      rows: hospitals,
      loading: hospitalsBusy,
      error: hospitalError,
    };
    if (selected === "registrations") return {
      title: "New Registration",
      description: "Hospitals registered this month.",
      headers: ["Hospital", "Admin email", "Registered", "Plan", "Status"],
      rows: registrations,
      loading: hospitalsBusy,
      error: hospitalError,
    };
    if (selected === "subscriptions") return {
      title: "Active Subscriptions",
      description: "Hospitals with an active subscription.",
      headers: ["Hospital", "Plan", "Billing cycle", "Status", "Renews on"],
      rows: subscriptions,
      loading: hospitalsBusy,
      error: hospitalError,
    };
    if (selected === "revenue") return {
      title: "Revenue Collected This Month",
      description: "Paid invoices recorded this month.",
      headers: ["Invoice", "Hospital", "Paid on", "Amount", "Method"],
      rows: [],
      loading: false,
      unavailable: true,
    };
    return {
      title: "Invoices",
      description: "Platform billing invoices.",
      headers: ["Invoice", "Hospital", "Due date", "Amount", "Status"],
      rows: [],
      loading: false,
      unavailable: true,
    };
  }, [hospitalError, hospitals, hospitalsBusy, registrations, selected, subscriptions]);

  return (
    <section className="dash-page">
      <h1 className="dash-sr">Dashboard</h1>

      <div className="kpi-grid dash-kpi-row" role="group" aria-label="Dashboard data filters">
        {CARDS.map((card) => {
          const Icon = card.icon;
          const active = selected === card.key;
          return (
            <button
              key={card.key}
              type="button"
              className={`card dash-kpi${active ? " is-selected" : ""}`}
              aria-pressed={active}
              onClick={() => setSelected(card.key)}
            >
              <span className="dash-kpi-copy">
                <span className="dash-kpi-label">{card.label}</span>
                <span className="dash-kpi-value">{metric(card.key)}</span>
                <span className="dash-kpi-hint">{card.hint}</span>
              </span>
              <span className="dash-kpi-icon" aria-hidden="true"><Icon size={17} /></span>
            </button>
          );
        })}
      </div>

      <section className="card card-pad dash-filter-table" aria-live="polite">
        <div className="dash-panel-head">
          <div>
            <h2 className="panel-title">{table.title}</h2>
            <p className="panel-copy">{table.description}</p>
          </div>
          <div className="dash-table-actions">
            {updatedAt && !table.unavailable && (
              <time className="dash-updated" dateTime={new Date(updatedAt).toISOString()}>
                Updated {formatDateTime(updatedAt)}
              </time>
            )}
            {!table.unavailable && (
              <Button variant="secondary" size="sm" disabled={refreshing || hospitalsLoading} onClick={reload}>
                {refreshing || hospitalsLoading ? "Refreshing…" : "Refresh"}
              </Button>
            )}
            <span className="dash-result-count">
              {table.loading ? "Loading" : table.error || table.unavailable ? "Unavailable" : `${table.rows.length} records`}
            </span>
          </div>
        </div>
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead><tr>{table.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
            <tbody>
              {table.loading ? (
                <tr><td colSpan={table.headers.length}><p className="dash-empty">Loading {table.title.toLowerCase()}…</p></td></tr>
              ) : table.unavailable ? (
                <tr><td colSpan={table.headers.length}><p className="dash-empty">Invoice and revenue data are unavailable to the Platform Admin role.</p></td></tr>
              ) : table.error ? (
                <tr><td colSpan={table.headers.length}><p className="dash-empty" role="alert">{table.error}</p></td></tr>
              ) : table.rows.length === 0 ? (
                <tr><td colSpan={table.headers.length}><p className="dash-empty">No {table.title.toLowerCase()} to show.</p></td></tr>
              ) : (
                <DashboardRows
                  type={selected}
                  rows={table.rows}
                  onOpenHospital={(hospital) => navigate(`${PLATFORM_BASE}/hospitals/${hospital.tenant_id}`)}
                />
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="dash-charts chart-grid">
        <DashboardChartState
          title="Hospital registration growth"
          loading={hospitalsBusy}
          error={hospitalError || (!growth.ok ? growth.error : "")}
          empty={hospitals.length === 0 && !hospitalError}
          emptyTitle="No registration history"
          emptyMessage="Registration history appears after hospitals are registered."
        >
          <TenantGrowthChart data={growth.rows} title="Hospital registration growth" />
        </DashboardChartState>
        <DashboardChartState
          title="Subscription plan distribution"
          loading={hospitalsBusy}
          error={hospitalError}
          empty={plans.length === 0 && !hospitalError}
          emptyTitle="No subscription data"
          emptyMessage="Plan distribution appears after hospitals are registered."
        >
          <PlanChart data={plans} title="Subscription plan distribution" />
        </DashboardChartState>
        <RevenueTrendChart data={[]} />
      </div>
    </section>
  );
}
