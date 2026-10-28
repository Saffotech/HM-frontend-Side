import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import Button from "../../../../shared/components/Button";
import SearchBar from "../../../../shared/components/SearchBar";
import Select from "../../../../shared/components/Select";
import { activePlanNames } from "../../../../shared/api/platformPlans";
import { PLAN_NAMES } from "../../../../shared/data/catalog";
import { usePlatformPlans } from "../../../../shared/hooks/usePlatformPlans";
import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { PLATFORM_BASE } from "../../../../shared/paths";
import { formatDate } from "../../../../shared/utils/formatDate";
import { useRegisteredHospitals } from "../../useRegisteredHospitals";
import "./Subscriptions.css";

const FILTERS = { query: "", plan: "", status: "", cycle: "" };

function statusKey(hospital) {
  if (hospital.is_active === false) return "suspended";
  return String(hospital.subscription_status || hospital.tenant_status || "").toLowerCase();
}

function chipClass(status) {
  if (status === "active") return "subs-chip subs-chip-active";
  if (status === "trial") return "subs-chip subs-chip-trial";
  if (status === "past due") return "subs-chip subs-chip-pastdue";
  if (status === "suspended") return "subs-chip subs-chip-suspended";
  return "subs-chip subs-chip-cancelled";
}

export default function Subscriptions() {
  const navigate = useNavigate();
  const { hospitals, loading, error } = useRegisteredHospitals();
  const { plans } = usePlatformPlans();
  const planNames = useMemo(() => {
    const remote = activePlanNames(plans);
    return remote.length ? remote : PLAN_NAMES;
  }, [plans]);
  const [filters, setFilters] = useState(FILTERS);
  const set = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  const counts = useMemo(() => ({
    all: hospitals.length,
    active: hospitals.filter((hospital) => statusKey(hospital) === "active").length,
    trial: hospitals.filter((hospital) => statusKey(hospital) === "trial").length,
    pastdue: hospitals.filter((hospital) => statusKey(hospital) === "past due").length,
    suspended: hospitals.filter((hospital) => statusKey(hospital) === "suspended").length,
  }), [hospitals]);

  const rows = useMemo(() => hospitals.filter((hospital) => {
    const haystack = `${hospital.name || ""} ${hospital.code || ""} ${hospital.tenant_id || ""}`.toLowerCase();
    if (filters.query && !haystack.includes(filters.query.trim().toLowerCase())) return false;
    if (filters.plan && hospital.plan !== filters.plan) return false;
    if (filters.status && statusKey(hospital) !== filters.status) return false;
    if (filters.cycle && hospital.billing_cycle !== filters.cycle) return false;
    return true;
  }), [hospitals, filters]);

  const summary = [
    ["all", "All", counts.all, ""],
    ["active", "Subscription Active", counts.active, "tone-active"],
    ["trial", "Trial", counts.trial, "tone-trial"],
    ["past due", "Past due", counts.pastdue, "tone-pastdue"],
    ["suspended", "Suspended", counts.suspended, ""],
  ];

  return (
    <section className="subs-page">
     
      <div className="subs-summary">
        {summary.map(([key, label, value, tone]) => (
          <button
            key={key}
            type="button"
            className={`subs-summary-item clickable${filters.status === (key === "all" ? "" : key) && (key === "all" ? !filters.status : true) ? " selected" : ""}`}
            onClick={() => set("status", key === "all" ? "" : key)}
          >
            <span>{label}</span>
            <strong className={tone}>{value}</strong>
          </button>
        ))}
      </div>

      <section className="subs-panel">
        <div className="subs-toolbar">
          <SearchBar value={filters.query} onChange={(value) => set("query", value)} placeholder="Search hospital or code" />
          <Select label="Plan" value={filters.plan} onChange={(event) => set("plan", event.target.value)}>
            <option value="">All plans</option>
            {planNames.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
          </Select>
          <Select label="Billing" value={filters.cycle} onChange={(event) => set("cycle", event.target.value)}>
            <option value="">All cycles</option>
            <option value="Monthly">Monthly</option>
            <option value="Annual">Annual</option>
          </Select>
          <Button variant="secondary" onClick={() => setFilters(FILTERS)}>Reset</Button>
        </div>
        {filters.status && (
          <div className="subs-meta">
            <span className="subs-filter-tag">
              {filters.status}
              <button type="button" aria-label="Clear status filter" onClick={() => set("status", "")}><X size={12} /></button>
            </span>
          </div>
        )}
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Hospital</th>
                <th>Plan</th>
                <th>Billing</th>
                <th>Amount</th>
                <th>Renewal</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6}><p className="subs-muted" style={{ margin: "14px 0" }}>{loading ? "Loading hospitals." : error || "No hospitals are registered yet."}</p></td>
                </tr>
              ) : rows.map((hospital) => {
                const status = statusKey(hospital);
                const statusLabel = hospital.is_active === false
                  ? "Suspended"
                  : (hospital.subscription_status || hospital.tenant_status || "—");
                return (
                  <tr
                    key={hospital.tenant_id}
                    className="subs-row-clickable"
                    tabIndex={0}
                    onClick={() => navigate(`${PLATFORM_BASE}/hospitals/${hospital.tenant_id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`${PLATFORM_BASE}/hospitals/${hospital.tenant_id}`);
                      }
                    }}
                  >
                    <td>
                      <span className="subs-name">{hospital.name || "Hospital"}</span>
                      <span className="subs-id">{hospital.code || hospital.tenant_id}</span>
                    </td>
                    <td>{hospital.plan || "—"}</td>
                    <td>{hospital.billing_cycle || "—"}</td>
                    <td className="subs-amount">{hospital.subscription_amount == null || hospital.subscription_amount === "" ? "—" : formatCurrency(hospital.subscription_amount)}</td>
                    <td className="subs-renewal">{formatDate(hospital.subscription_renews_on)}</td>
                    <td><span className={chipClass(status)}>{statusLabel}</span></td>
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
