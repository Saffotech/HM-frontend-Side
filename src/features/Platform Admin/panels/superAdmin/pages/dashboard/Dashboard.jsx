import { useMemo, useState } from "react";
import { Building2, CalendarPlus, IndianRupee, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../../../shared/components/Button";
import EmptyState from "../../../../shared/components/EmptyState";
import { revenueSnapshot } from "../../../../shared/api/platformRevenue";
import { usePlatformRevenue } from "../../../../shared/hooks/usePlatformRevenue";
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
  { key: "revenue", label: "Revenue", hint: "Collected hospital payments", icon: IndianRupee },
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

function paymentHospital(payment) {
  const name = payment.hospitalName || "Hospital";
  if (payment.tenantId == null) return name;
  return <Link to={`${PLATFORM_BASE}/hospitals/${payment.tenantId}`}>{name}</Link>;
}

function paidAmount(payment) {
  return payment.paymentAmount == null ? payment.amount : payment.paymentAmount;
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

  return rows.map((payment) => (
    <tr key={payment.id}>
      <td>{paymentHospital(payment)}</td>
      <td>{payment.plan || "—"}</td>
      <td>{formatDate(payment.paidAt)}</td>
      <td>{formatCurrency(paidAmount(payment))}</td>
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
  const {
    revenue,
    loading: revenueLoading,
    error: revenueError,
    reload: reloadRevenue,
  } = usePlatformRevenue();
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

  const payments = useMemo(
    () => (revenue?.invoices || []).filter((row) => row.bucket === "collected"),
    [revenue],
  );

  const metric = (key) => {
    if (key === "revenue") {
      if (revenueLoading && !revenue) return "…";
      if (!revenue) return "—";
      return formatCurrency(revenue.collectedAmount);
    }
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
      refreshing: refreshing || hospitalsLoading,
      refresh: reload,
    };
    if (selected === "registrations") return {
      title: "New Registration",
      description: "Hospitals registered this month.",
      headers: ["Hospital", "Admin email", "Registered", "Plan", "Status"],
      rows: registrations,
      loading: hospitalsBusy,
      error: hospitalError,
      refreshing: refreshing || hospitalsLoading,
      refresh: reload,
    };
    if (selected === "subscriptions") return {
      title: "Active Subscriptions",
      description: "Hospitals with an active subscription.",
      headers: ["Hospital", "Plan", "Billing cycle", "Status", "Renews on"],
      rows: subscriptions,
      loading: hospitalsBusy,
      error: hospitalError,
      refreshing: refreshing || hospitalsLoading,
      refresh: reload,
    };
    return {
      title: "Hospital payments",
      // description: "Each collected payment, listed by hospital. Pending and failed invoices are not included.",
      headers: ["Hospital", "Plan", "Paid on", "Amount"],
      rows: payments,
      loading: revenueLoading && !revenue,
      error: revenueError,
      refreshing: revenueLoading,
      refresh: reloadRevenue,
    };
  }, [hospitalError, hospitals, hospitalsBusy, hospitalsLoading, payments, refreshing, registrations, reload, reloadRevenue, revenue, revenueError, revenueLoading, selected, subscriptions]);

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
            {updatedAt && selected !== "revenue" && (
              <time className="dash-updated" dateTime={new Date(updatedAt).toISOString()}>
                Updated {formatDateTime(updatedAt)}
              </time>
            )}
            <Button
              variant="secondary"
              size="sm"
              disabled={table.refreshing}
              onClick={table.refresh}
            >
              {table.refreshing ? "Refreshing…" : "Refresh"}
            </Button>
            <span className="dash-result-count">
              {table.loading ? "Loading" : table.error ? "Unavailable" : `${table.rows.length} records`}
            </span>
          </div>
        </div>
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead><tr>{table.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
            <tbody>
              {table.loading ? (
                <tr><td colSpan={table.headers.length}><p className="dash-empty">Loading {table.title.toLowerCase()}…</p></td></tr>
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
        <RevenueTrendChart
          data={revenueError ? [] : revenueSnapshot(revenue)}
          description="Collected, pending, and overdue subscription invoices. Failed invoices are not included in these amounts."
          emptyMessage={revenueError || (revenueLoading ? "Loading revenue…" : "No subscription invoices yet.")}
        />
      </div>
    </section>
  );
}
