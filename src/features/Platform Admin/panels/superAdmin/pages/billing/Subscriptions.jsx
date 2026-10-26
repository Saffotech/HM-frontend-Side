import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import Button from "../../../../shared/components/Button";
import Modal from "../../../../shared/components/Modal";
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
  const { hospitals, loading, error } = useRegisteredHospitals();
  const { plans } = usePlatformPlans();
  const planNames = useMemo(() => {
    const remote = activePlanNames(plans);
    return remote.length ? remote : PLAN_NAMES;
  }, [plans]);
  const [filters, setFilters] = useState(FILTERS);
  const [open, setOpen] = useState(null);
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
    ["active", "Active", counts.active, "tone-active"],
    ["trial", "Trial", counts.trial, "tone-trial"],
    ["past due", "Past due", counts.pastdue, "tone-pastdue"],
    ["suspended", "Suspended", counts.suspended, ""],
  ];

  return (
    <section className="subs-page">
      <header className="page-header">
        <h1>Subscriptions</h1>
      </header>
     
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
          <Select label="Status" value={filters.status} onChange={(event) => set("status", event.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="past due">Past due</option>
            <option value="suspended">Suspended</option>
          </Select>
          <Select label="Billing" value={filters.cycle} onChange={(event) => set("cycle", event.target.value)}>
            <option value="">All cycles</option>
            <option value="Monthly">Monthly</option>
            <option value="Annual">Annual</option>
          </Select>
          <Button variant="secondary" onClick={() => setFilters(FILTERS)}>Reset</Button>
        </div>
        <div className="subs-meta">
          <span>{rows.length} subscription{rows.length === 1 ? "" : "s"}</span>
          {filters.status && (
            <span className="subs-filter-tag">
              {filters.status}
              <button type="button" aria-label="Clear status filter" onClick={() => set("status", "")}><X size={12} /></button>
            </span>
          )}
        </div>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7}><p className="subs-muted" style={{ margin: "14px 0" }}>{loading ? "Loading hospitals." : error || "No hospitals are registered yet."}</p></td>
                </tr>
              ) : rows.map((hospital) => {
                const status = statusKey(hospital);
                const statusLabel = hospital.is_active === false
                  ? "Suspended"
                  : (hospital.subscription_status || hospital.tenant_status || "—");
                return (
                  <tr key={hospital.tenant_id}>
                    <td>
                      <Link className="subs-name" to={`${PLATFORM_BASE}/hospitals/${hospital.tenant_id}`}>{hospital.name || "Hospital"}</Link>
                      <span className="subs-id">{hospital.code || hospital.tenant_id}</span>
                    </td>
                    <td>{hospital.plan || "—"}</td>
                    <td>{hospital.billing_cycle || "—"}</td>
                    <td className="subs-amount">{hospital.subscription_amount == null || hospital.subscription_amount === "" ? "—" : formatCurrency(hospital.subscription_amount)}</td>
                    <td className="subs-renewal">{formatDate(hospital.subscription_renews_on)}</td>
                    <td><span className={chipClass(status)}>{statusLabel}</span></td>
                    <td>
                      <div className="subs-actions">
                        <Button variant="outline" size="sm" onClick={() => setOpen(hospital)}>View</Button>
                        <Link className="btn btn-outline btn-sm" to={`${PLATFORM_BASE}/hospitals/${hospital.tenant_id}`}>Edit</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={Boolean(open)}
        title={open?.name || "Subscription"}
        subtitle="From the hospital registration"
        onClose={() => setOpen(null)}
        footer={<Button variant="secondary" onClick={() => setOpen(null)}>Close</Button>}
      >
        {open && (
          <dl className="subs-info">
            <div className="subs-info-row"><dt>Hospital</dt><dd>{open.name || "—"}</dd></div>
            <div className="subs-info-row"><dt>Code</dt><dd>{open.code || "—"}</dd></div>
            <div className="subs-info-row"><dt>Plan</dt><dd>{open.plan || "—"}</dd></div>
            <div className="subs-info-row"><dt>Billing</dt><dd>{open.billing_cycle || "—"}</dd></div>
            <div className="subs-info-row"><dt>Started</dt><dd>{formatDate(open.subscription_started_on)}</dd></div>
            <div className="subs-info-row"><dt>Renews</dt><dd>{formatDate(open.subscription_renews_on)}</dd></div>
            <div className="subs-info-row"><dt>Status</dt><dd>{open.subscription_status || open.tenant_status || "—"}</dd></div>
            <div className="subs-info-row"><dt>Amount</dt><dd>{open.subscription_amount == null || open.subscription_amount === "" ? "—" : formatCurrency(open.subscription_amount)}</dd></div>
          </dl>
        )}
      </Modal>
    </section>
  );
}
