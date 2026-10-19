import { Link } from "react-router-dom";
import {
  Building2,
  Handshake,
  IndianRupee,
  Receipt,
  UserPlus,
  Users,
} from "lucide-react";
import { PLATFORM_BASE, platformPath } from "../../../../shared/paths";
import { registrationMonths, registrationsThisMonth } from "../../sessionHospitals";
import { useRegisteredHospitals } from "../../useRegisteredHospitals";
import { RegistrationChart, RevenueTrendChart } from "./DashboardCharts";
import "./Dashboard.css";

const KPIS = [
  {
    key: "hospitals",
    label: "Hospitals",
    hint: "Registered on the server",
    to: platformPath("/hospitals"),
    icon: Building2,
  },
  {
    key: "month",
    label: "New registrations",
    hint: "This month",
    to: platformPath("/hospitals/register"),
    icon: UserPlus,
  },
  {
    label: "CRM pipeline",
    hint: "Leads and follow-ups",
    to: platformPath("/crm-performance"),
    icon: Handshake,
  },
  {
    label: "Subscriptions",
    hint: "Active plans",
    to: platformPath("/billing/subscriptions"),
    icon: Users,
  },
  {
    label: "Invoices",
    hint: "Billing queue",
    to: platformPath("/billing/revenue"),
    icon: Receipt,
  },
  {
    label: "Revenue",
    hint: "Collected this month",
    to: platformPath("/billing/revenue"),
    icon: IndianRupee,
  },
];

function statusClass(status) {
  const value = String(status || "").toLowerCase();
  if (value === "active") return "dash-status dash-status-ok";
  if (value === "suspended") return "dash-status dash-status-bad";
  if (value === "trial") return "dash-status dash-status-info";
  return "dash-status dash-status-mute";
}

export default function Dashboard() {
  const { hospitals, loading, error } = useRegisteredHospitals();
  const recent = hospitals.slice(0, 5);
  const activePlans = hospitals.filter((hospital) => String(hospital.subscription_status || "").toLowerCase() === "active").length;

  return (
    <section className="dash-page">
      <h1 className="dash-sr">Dashboard</h1>
      <p className="panel-copy">
        Hospital counts include every hospital registered on the server, including ones created by the accountant. Invoices, revenue, and CRM stay blank until those APIs exist.
      </p>
      {error && <p className="panel-copy" role="alert">{error}</p>}

      <div className="kpi-grid">
        {KPIS.map((item) => {
          const Icon = item.icon;
          const value = loading
            ? "…"
            : item.key === "hospitals"
              ? hospitals.length
              : item.key === "month"
                ? registrationsThisMonth(hospitals)
                : item.label === "Subscriptions"
                  ? activePlans
                  : "—";
          return (
            <Link key={item.label} className="card dash-kpi" to={item.to}>
              <span>
                <span className="dash-kpi-label">{item.label}</span>
                <span className="dash-kpi-value">{value}</span>
                <span className="dash-kpi-hint">{item.hint}</span>
              </span>
              <span className="dash-kpi-icon" aria-hidden="true">
                <Icon size={16} />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="dash-charts chart-grid">
        <RegistrationChart data={registrationMonths(hospitals)} />
        <RevenueTrendChart data={[]} />
      </div>

      <div className="dash-ops">
        <section className="card card-pad" aria-label="Recent hospitals">
          <div className="dash-panel-head">
            <div>
              <h2 className="panel-title">Recent hospitals</h2>
              <p className="panel-copy">Newest hospitals registered on the server.</p>
            </div>
            <Link to={platformPath("/hospitals")}>View all</Link>
          </div>
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Hospital</th>
                  <th>Plan</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <p className="dash-empty">
                        {loading ? "Loading registered hospitals." : error || "No hospitals are registered yet."}
                      </p>
                    </td>
                  </tr>
                ) : recent.map((hospital) => {
                  const status = hospital.subscription_status || hospital.tenant_status || "—";
                  return (
                    <tr key={hospital.tenant_id}>
                      <td>
                        <Link to={`${PLATFORM_BASE}/hospitals/${hospital.tenant_id}`}>{hospital.name || "Hospital"}</Link>
                      </td>
                      <td>{hospital.plan || "—"}</td>
                      <td><span className={statusClass(status)}>{status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card card-pad" aria-label="Recent activity">
          <div className="dash-panel-head">
            <div>
              <h2 className="panel-title">Recent activity</h2>
              <p className="panel-copy">Registrations, plan changes, and payments will list here.</p>
            </div>
            <Link to={platformPath("/billing/revenue")}>Billing</Link>
          </div>
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Event</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={3}>
                    <p className="dash-empty">No activity feed is connected yet.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}
