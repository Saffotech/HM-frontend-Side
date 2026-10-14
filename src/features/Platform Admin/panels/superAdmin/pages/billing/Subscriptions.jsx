import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import Button from "../../../../shared/components/Button";
import DataTable from "../../../../shared/components/DataTable";
import Modal from "../../../../shared/components/Modal";
import Pagination from "../../../../shared/components/Pagination";
import SearchBar from "../../../../shared/components/SearchBar";
import Select from "../../../../shared/components/Select";
import { buildSubscriptions } from "../../../../shared/data/subscriptionsData";
import { usePlatform } from "../../../../shared/context/PlatformContext";
import { usePagination } from "../../../../shared/hooks/usePagination";
import { PLATFORM_BASE } from "../../../../shared/paths";
import { daysUntil, formatDate } from "../../../../shared/utils/formatDate";
import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { includesQuery, sortRows } from "../../../../shared/utils/table";
import "./Subscriptions.css";

const STATUSES = ["Active", "Trial", "Past Due", "Suspended", "Cancelled"];
const CYCLES = ["Monthly", "Annual"];

function renewsWithin30Days(item) {
  if (item.status === "Cancelled") return false;
  const days = daysUntil(item.renewalDate);
  return days >= 0 && days <= 30;
}

export default function Subscriptions() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { hospitals } = usePlatform();
  const query = params.get("q") || "";
  const [search, setSearch] = useState(query);
  const [urlQuery, setUrlQuery] = useState(query);
  const [status, setStatus] = useState("All");
  const [plan, setPlan] = useState("All");
  const [cycle, setCycle] = useState("All");
  const [renewingSoon, setRenewingSoon] = useState(false);
  const [sortKey, setSortKey] = useState("tenant");
  const [sortDirection, setSortDirection] = useState("asc");
  const [selectedId, setSelectedId] = useState(null);
  if (query !== urlQuery) {
    setUrlQuery(query);
    setSearch(query);
  }

  const subscriptions = useMemo(() => buildSubscriptions(hospitals), [hospitals]);
  const selected = subscriptions.find((item) => item.id === selectedId) || null;
  const plans = [...new Set(hospitals.map((hospital) => hospital.plan))];

  const summary = useMemo(() => {
    return {
      active: subscriptions.filter((item) => item.status === "Active").length,
      trial: subscriptions.filter((item) => item.status === "Trial").length,
      pastDue: subscriptions.filter((item) => item.status === "Past Due").length,
      renewing: subscriptions.filter(renewsWithin30Days).length,
      mrr: subscriptions.reduce((sum, item) => sum + (item.monthlyRecurring || 0), 0),
    };
  }, [subscriptions]);

  const rows = useMemo(() => {
    const filtered = subscriptions.filter((item) => {
      const matchesStatus = status === "All" || item.status === status;
      const matchesPlan = plan === "All" || item.plan === plan;
      const matchesCycle = cycle === "All" || item.billingCycle === cycle;
      const matchesRenewal = !renewingSoon || renewsWithin30Days(item);
      return matchesStatus && matchesPlan && matchesCycle && matchesRenewal && includesQuery([item.tenant, item.plan, item.tenantId], search);
    });
    return sortRows(filtered, sortKey, sortDirection);
  }, [subscriptions, plan, cycle, renewingSoon, search, sortDirection, sortKey, status]);
  const pagination = usePagination(rows, 10, `${search}|${status}|${plan}|${cycle}|${renewingSoon}|${sortKey}|${sortDirection}`);

  const resetFilters = () => {
    setSearch("");
    setStatus("All");
    setPlan("All");
    setCycle("All");
    setRenewingSoon(false);
  };

  const showStatus = (next) => {
    setStatus(next);
    setRenewingSoon(false);
  };

  const showRenewingSoon = () => {
    setStatus("All");
    setRenewingSoon(true);
    setSortKey("renewalDate");
    setSortDirection("asc");
  };

  return (
    <section className="subs-page">
      <div className="subs-summary">
        <SummaryCell label="Active" value={summary.active} tone="active" onClick={() => showStatus("Active")} selected={!renewingSoon && status === "Active"} />
        <SummaryCell label="On trial" value={summary.trial} tone="trial" onClick={() => showStatus("Trial")} selected={!renewingSoon && status === "Trial"} />
        <SummaryCell label="Past due" value={summary.pastDue} tone="pastdue" onClick={() => showStatus("Past Due")} selected={!renewingSoon && status === "Past Due"} />
        <SummaryCell label="Renewing in 30 days" value={summary.renewing} onClick={showRenewingSoon} selected={renewingSoon} />
        <SummaryCell label="Monthly recurring revenue" value={formatCurrency(summary.mrr)} />
      </div>

      <section className="subs-panel">
        <div className="subs-toolbar">
          <SearchBar value={search} onChange={setSearch} placeholder="Search tenant, ID, or plan" />
          <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option>All</option>
            {STATUSES.map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select label="Plan" value={plan} onChange={(event) => setPlan(event.target.value)}>
            <option>All</option>
            {plans.map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select label="Billing cycle" value={cycle} onChange={(event) => setCycle(event.target.value)}>
            <option>All</option>
            {CYCLES.map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Button variant="secondary" onClick={resetFilters}>Reset</Button>
        </div>
        <div className="subs-meta">
          <span>{rows.length} subscription{rows.length === 1 ? "" : "s"}</span>
          {renewingSoon && (
            <span className="subs-filter-tag">
              Renewing in the next 30 days
              <button type="button" aria-label="Clear renewing in 30 days filter" onClick={() => setRenewingSoon(false)}>
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          )}
        </div>
        <DataTable
          rows={pagination.rows}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={(key) => {
            if (sortKey === key) setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
            else { setSortKey(key); setSortDirection("asc"); }
          }}
          emptyTitle="No subscriptions"
          emptyMessage="No subscriptions match these filters."
          columns={[
            {
              key: "tenant",
              label: "Tenant",
              sortable: true,
              render: (row) => (
                <>
                  <span className="subs-name">{row.tenant}</span>
                  <span className="subs-id">{row.tenantId}</span>
                </>
              ),
            },
            { key: "plan", label: "Plan", sortable: true },
            { key: "status", label: "Status", sortable: true, render: (row) => <StatusChip status={row.status} /> },
            { key: "billingCycle", label: "Cycle", sortable: true },
            {
              key: "amount",
              label: "Amount",
              sortable: true,
              render: (row) => (
                <span className="subs-amount">
                  {formatCurrency(row.amount)}
                  <small>/{row.billingCycle === "Annual" ? "yr" : "mo"}</small>
                </span>
              ),
            },
            { key: "startDate", label: "Start Date", sortable: true, render: (row) => formatDate(row.startDate) },
            { key: "renewalDate", label: "Renewal", sortable: true, render: (row) => <Renewal row={row} /> },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <div className="subs-actions">
                  <button type="button" className="action-link" onClick={() => setSelectedId(row.id)}>View</button>
                </div>
              ),
            },
          ]}
        />
        <Pagination {...pagination} onPageChange={pagination.setPage} />
      </section>

      <Modal
        open={Boolean(selected)}
        title={selected?.tenant || "Subscription"}
        subtitle={selected ? `${selected.id} · ${selected.plan} plan` : ""}
        onClose={() => setSelectedId(null)}
        size="lg"
        footer={selected && (
          <>
            <Button variant="secondary" onClick={() => setSelectedId(null)}>Close</Button>
            <Button onClick={() => navigate(`${PLATFORM_BASE}/hospitals/${selected.tenantId}`)}>Open hospital</Button>
          </>
        )}
      >
        {selected && (
          <dl className="subs-info">
            <InfoRow label="Plan" value={selected.plan} />
            <InfoRow label="Status" value={<StatusChip status={selected.status} />} />
            <InfoRow label="Billing cycle" value={selected.billingCycle} />
            <InfoRow label="Cycle amount" value={formatCurrency(selected.amount)} />
            <InfoRow label="Monthly value" value={formatCurrency(selected.monthlyRecurring)} />
            <InfoRow label="Tenant ID" value={<span className="subs-id">{selected.tenantId}</span>} />
            <InfoRow label="Started" value={formatDate(selected.startDate)} />
            <InfoRow label="Renews" value={<Renewal row={selected} />} />
          </dl>
        )}
      </Modal>
    </section>
  );
}

function SummaryCell({ label, value, tone, onClick, selected }) {
  const content = (
    <>
      <span>{label}</span>
      <strong className={tone ? `tone-${tone}` : ""}>{value}</strong>
    </>
  );
  if (!onClick) return <div className="subs-summary-item">{content}</div>;
  return (
    <button type="button" className={`subs-summary-item clickable ${selected ? "selected" : ""}`} onClick={onClick}>
      {content}
    </button>
  );
}

function StatusChip({ status }) {
  const tone = {
    Active: "active",
    Trial: "trial",
    "Past Due": "pastdue",
    Suspended: "suspended",
    Cancelled: "cancelled",
  }[status] || "cancelled";
  return <span className={`subs-chip subs-chip-${tone}`}>{status}</span>;
}

function Renewal({ row }) {
  if (row.status === "Cancelled") return <span className="subs-muted">—</span>;
  const days = daysUntil(row.renewalDate);
  let hint = `in ${days} days`;
  let tone = "";
  if (days < 0) { hint = `${Math.abs(days)} days overdue`; tone = "late"; }
  else if (days === 0) { hint = "today"; tone = "soon"; }
  else if (days <= 7) tone = "soon";
  return (
    <span className="subs-renewal">
      {formatDate(row.renewalDate)}
      <small className={tone}>{hint}</small>
    </span>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="subs-info-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
