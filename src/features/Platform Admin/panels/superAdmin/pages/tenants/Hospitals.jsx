import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../../../shared/components/Button";
import Pagination from "../../../../shared/components/Pagination";
import { usePagination } from "../../../../shared/hooks/usePagination";
import SearchBar from "../../../../shared/components/SearchBar";
import Select from "../../../../shared/components/Select";
import { billingCycles } from "../../../../shared/data/catalog";
import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { daysUntil, formatDate, formatDateTime } from "../../../../shared/utils/formatDate";
import { PLATFORM_BASE, platformPath } from "../../../../shared/paths";
import { useRegisteredHospitals } from "../../useRegisteredHospitals";
import "./Hospitals.css";

const PAGE_SIZE = 8;
const EMPTY_FILTERS = {
  query: "",
  plan: "",
  cycle: "",
  type: "",
  status: "",
  activation: "",
};

function text(value) {
  return String(value || "").trim();
}

function subscriptionKey(hospital) {
  return text(hospital.subscription_status || hospital.tenant_status).toLowerCase();
}

function activationKey(hospital) {
  if (hospital.is_active === true) return "active";
  if (hospital.is_active === false) return "suspended";
  return "";
}

function activationLabel(hospital) {
  if (hospital.is_active === true) return "Active";
  if (hospital.is_active === false) return "Suspended";
  return "";
}

function chipClass(value) {
  const key = text(value).toLowerCase();
  if (key === "active") return "status-chip status-active";
  if (key === "trial") return "status-chip status-trial";
  if (key === "suspended") return "status-chip status-suspended";
  return "status-chip status-closed";
}

function uniqueValues(hospitals, read) {
  return [...new Set(hospitals.map(read).map(text).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function matches(hospital, filters) {
  const query = filters.query.trim().toLowerCase();
  if (query) {
    const haystack = [
      hospital.name,
      hospital.code,
      hospital.tenant_id,
      hospital.city,
      hospital.state,
      hospital.hospital_type,
      hospital.admin_email,
      hospital.phone,
      hospital.plan,
    ].join(" ").toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  if (filters.plan && hospital.plan !== filters.plan) return false;
  if (filters.cycle && hospital.billing_cycle !== filters.cycle) return false;
  if (filters.type && hospital.hospital_type !== filters.type) return false;
  if (filters.status && subscriptionKey(hospital) !== filters.status) return false;
  if (filters.activation && activationKey(hospital) !== filters.activation) return false;
  return true;
}

function sortValue(hospital, key) {
  if (key === "name") return hospital.name || "";
  if (key === "code") return hospital.code || "";
  if (key === "plan") return hospital.plan || "";
  if (key === "renewal") return hospital.subscription_renews_on || "";
  return hospital.created_at || "";
}

export default function Hospitals() {
  const navigate = useNavigate();
  const {
    hospitals,
    loading,
    refreshing,
    error,
    refreshError,
    updatedAt,
    reload,
  } = useRegisteredHospitals();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState({ key: "created", direction: "desc" });
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  const plans = useMemo(() => uniqueValues(hospitals, (hospital) => hospital.plan), [hospitals]);
  const types = useMemo(() => uniqueValues(hospitals, (hospital) => hospital.hospital_type), [hospitals]);
  const cycles = useMemo(() => {
    const present = uniqueValues(hospitals, (hospital) => hospital.billing_cycle);
    return present.length ? present : billingCycles;
  }, [hospitals]);

  const counts = useMemo(() => ({
    all: hospitals.length,
    active: hospitals.filter((hospital) => subscriptionKey(hospital) === "active").length,
    trial: hospitals.filter((hospital) => subscriptionKey(hospital) === "trial").length,
    suspended: hospitals.filter((hospital) => activationKey(hospital) === "suspended").length,
  }), [hospitals]);

  const filtered = useMemo(() => {
    const rows = hospitals.filter((hospital) => matches(hospital, filters));
    const direction = sort.direction === "asc" ? 1 : -1;
    return rows.slice().sort((left, right) => (
      String(sortValue(left, sort.key)).localeCompare(String(sortValue(right, sort.key)), undefined, { numeric: true, sensitivity: "base" }) * direction
    ));
  }, [filters, hospitals, sort]);

  const pagination = usePagination(
    filtered,
    PAGE_SIZE,
    [filters.query, filters.plan, filters.cycle, filters.type, filters.status, filters.activation, sort.key, sort.direction].join("|"),
  );
  const pageRows = pagination.rows;
  const filtersActive = Object.values(filters).some(Boolean);
  const summaryKey = filters.status === "active" && !filters.activation
    ? "active"
    : filters.status === "trial" && !filters.activation
    ? "trial"
      : filters.activation === "suspended" && !filters.status
        ? "suspended"
        : !filters.status && !filters.activation
          ? "all"
          : "";

  const applySummary = (key) => {
    if (key === "all") {
      setFilters((current) => ({ ...current, status: "", activation: "" }));
      return;
    }
    if (key === "trial") {
      setFilters((current) => ({ ...current, status: "trial", activation: "" }));
      return;
    }
    if (key === "active") {
      setFilters((current) => ({ ...current, status: "active", activation: "" }));
      return;
    }
    setFilters((current) => ({ ...current, status: "", activation: key }));
  };

  const toggleSort = (key) => {
    setSort((current) => (
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "created" || key === "renewal" ? "desc" : "asc" }
    ));
  };

  const openHospital = (hospital) => {
    navigate(`${PLATFORM_BASE}/hospitals/${hospital.tenant_id}`);
  };

  return (
    <section className="hospitals-page">
      <header className="hospitals-head">
        <div>
         
        </div>
        <div className="hospitals-head-actions">
          <Button variant="secondary" onClick={reload} disabled={loading || refreshing}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
          <Button onClick={() => navigate(platformPath("/hospitals/register"))}>Register hospital</Button>
        </div>
      </header>

      <div className="hospitals-summary" role="group" aria-label="Filter hospitals by status">
        {[
          ["all", "All hospitals", counts.all, ""],
          ["active", "Subscription Active", counts.active, "tone-active"],
          ["trial", "Trial", counts.trial, "tone-trial"],
          ["suspended", "Suspended", counts.suspended, "tone-suspended"],
        ].map(([key, label, value, tone]) => (
          <button
            key={key}
            type="button"
            className={`hospitals-summary-item${summaryKey === key ? " is-selected" : ""}`}
            aria-pressed={summaryKey === key}
            onClick={() => applySummary(key)}
          >
            <span>{label}</span>
            <strong className={tone}>{loading && hospitals.length === 0 ? "…" : value}</strong>
          </button>
        ))}
      </div>

      {error ? <p className="hospitals-api-note hospitals-api-note-error" role="alert">{error}</p> : null}
      {refreshError ? <p className="hospitals-api-note hospitals-api-note-error" role="alert">{refreshError}</p> : null}

      <section className="hospitals-panel">
        <div className="hospitals-toolbar">
          <div className="hospitals-search">
            <label className="field-label" htmlFor="hospital-search">Search</label>
            <SearchBar id="hospital-search" value={filters.query} onChange={(value) => setFilter("query", value)} placeholder="Name, code, or email" />
          </div>
          <Select label="Plan" value={filters.plan} onChange={(event) => setFilter("plan", event.target.value)}>
            <option value="">All plans</option>
            {plans.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
          </Select>
          <Select label="Billing" value={filters.cycle} onChange={(event) => setFilter("cycle", event.target.value)}>
            <option value="">All cycles</option>
            {cycles.map((cycle) => <option key={cycle} value={cycle}>{cycle}</option>)}
          </Select>
          <Select label="Type" value={filters.type} onChange={(event) => setFilter("type", event.target.value)}>
            <option value="">All types</option>
            {types.map((type) => <option key={type} value={type}>{type}</option>)}
          </Select>
        </div>

        <div className="hospitals-meta">
          <span>
            {loading && hospitals.length === 0
              ? "Loading hospitals"
              : `${filtered.length} hospital${filtered.length === 1 ? "" : "s"}`}
            {updatedAt ? ` · Updated ${formatDateTime(updatedAt)}` : ""}
          </span>
        </div>

        <div className="hospitals-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th><SortHeader label="Hospital" column="name" sort={sort} onSort={toggleSort} /></th>
                <th><SortHeader label="Code" column="code" sort={sort} onSort={toggleSort} /></th>
                <th><SortHeader label="Plan" column="plan" sort={sort} onSort={toggleSort} /></th>
                <th><SortHeader label="Renewal" column="renewal" sort={sort} onSort={toggleSort} /></th>
                <th>Activation</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && hospitals.length === 0 ? (
                <tr><td colSpan={6}><p className="hospitals-empty">Loading hospitals.</p></td></tr>
              ) : error && hospitals.length === 0 ? (
                <tr><td colSpan={6}><p className="hospitals-empty" role="alert">{error}</p></td></tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <p className="hospitals-empty">
                      {filtersActive ? "No hospitals match these filters." : "No hospitals are registered yet."}
                    </p>
                  </td>
                </tr>
              ) : pageRows.map((hospital) => {
                const place = [hospital.city, hospital.state].map(text).filter(Boolean).join(", ");
                const renewal = hospital.subscription_renews_on;
                const remaining = renewal ? daysUntil(renewal) : null;
                const amount = hospital.subscription_amount == null || hospital.subscription_amount === ""
                  ? ""
                  : formatCurrency(hospital.subscription_amount);
                const activation = activationLabel(hospital);
                return (
                  <tr
                    key={hospital.tenant_id}
                    className="hospitals-row"
                    tabIndex={0}
                    aria-label={`Open ${hospital.name || "hospital"}`}
                    onClick={(event) => {
                      if (!event.target.closest("a, button")) openHospital(hospital);
                    }}
                    onKeyDown={(event) => {
                      if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        openHospital(hospital);
                      }
                    }}
                  >
                    <td>
                      <Link className="hospital-name" to={`${PLATFORM_BASE}/hospitals/${hospital.tenant_id}`}>
                        {hospital.name || "Hospital"}
                      </Link>
                      <span className="hospital-meta">{place || "—"}{hospital.admin_email ? ` · ${hospital.admin_email}` : ""}</span>
                    </td>
                    <td>
                      <span className="tenant-id">{hospital.code || "—"}</span>
                      {hospital.hospital_type ? <span className="hospital-meta">{hospital.hospital_type}</span> : null}
                    </td>
                    <td>
                      <span className="hospital-plan">{hospital.plan || "—"}</span>
                      <span className="hospital-meta">{[hospital.billing_cycle, amount].filter(Boolean).join(" · ") || "—"}</span>
                    </td>
                    <td>
                      <span className={remaining != null && remaining < 0 ? "hospital-renewal is-due" : "hospital-renewal"}>
                        {formatDate(renewal)}
                      </span>
                      {remaining != null && remaining < 0 ? <span className="hospital-meta">Date has passed</span> : null}
                    </td>
                    <td>{activation ? <span className={chipClass(activation)}>{activation}</span> : "—"}</td>
                    <td>
                      <Button variant="outline" size="sm" onClick={() => openHospital(hospital)}>View</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination {...pagination} onPageChange={pagination.setPage} />
      </section>
    </section>
  );
}

function SortHeader({ label, column, sort, onSort }) {
  const active = sort.key === column;
  return (
    <button
      type="button"
      className="sort-btn"
      aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
      onClick={() => onSort(column)}
    >
      {label}{active ? (sort.direction === "asc" ? " ↑" : " ↓") : ""}
    </button>
  );
}
