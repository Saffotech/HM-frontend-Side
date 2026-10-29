import { useState } from "react";
import {
  AlarmClock, BadgeCheck, Handshake, IndianRupee, Layers, PhoneCall, TriangleAlert, Trophy, UserX, Users,
} from "lucide-react";
import Button from "../../../../../shared/components/Button";
import Input from "../../../../../shared/components/Input";
import Select from "../../../../../shared/components/Select";
import { formatCurrency } from "../../../../../shared/utils/formatCurrency";
import { todayInput } from "../../../../../shared/utils/formatDate";
import EmployeeDetail from "./EmployeeDetail";
import { formatRate } from "./metrics";
import { PERIOD_PRESETS, toDay } from "../../../../../shared/utils/periods";
import { PerformanceTrend } from "./PerformanceCharts";
import { FollowUpTable, Leaderboard, RatingBadge } from "./PerformanceTables";
import SearchSelect from "./SearchSelect";
import { activePlanNames } from "../../../../../shared/api/platformPlans";
import { CRM_ANALYTICS_STATUSES } from "../../../../../shared/api/platformCrmAnalytics";
import { usePlatformPlans } from "../../../../../shared/hooks/usePlatformPlans";
import { useCrmFilterOptions, useCrmPerformance } from "./useCrmPerformance";
import "./CrmPerformance.css";

const DEFAULT_FILTERS = { preset: "month", start: "", end: "", employee: "all", status: "all", plan: "all", source: "all" };
const ACTIVE_PERIOD = {
  today: "today",
  week: "this week",
  month: "this month",
  lastMonth: "last month",
  quarter: "this quarter",
  custom: "in this range",
};

export default function CrmPerformance() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [detailName, setDetailName] = useState(null);
  const data = useCrmPerformance(filters);
  const { plans: catalogPlans } = usePlatformPlans();
  const options = useCrmFilterOptions(data.leads, data.leadStatus === "ready", data.employeeNames);
  const catalogNames = activePlanNames(catalogPlans);
  const filterOptions = catalogNames.length ? { ...options, plans: catalogNames } : options;
  const roster = options.employees;
  const ready = data.leadStatus === "ready";
  const period = ready ? data.period : null;
  const detail = ready ? (data.employees.find((row) => row.name === detailName) || null) : null;
  const activeLabel = ready && filters.employee === "all"
    ? `${data.team.current.activeEmployees} active ${ACTIVE_PERIOD[filters.preset] || "in this range"}`
    : "";

  return (
    <div className="cp-page">
      <FilterBar applied={filters} onApply={setFilters} options={filterOptions} />

      {!ready && (data.hospitalError || data.leadStatus === "loading" || data.leadStatus === "error") && (
        <div className="cp-page-status">
          {data.hospitalError && <p className="cp-muted" role="alert">{data.hospitalError}</p>}
          {data.leadStatus === "loading" && <p className="cp-muted">Loading CRM leads.</p>}
          {data.leadStatus === "error" && (
            <div role="alert">
              <p className="cp-muted">{data.leadError}</p>
              <Button variant="secondary" onClick={data.retryLeads}>Try again</Button>
            </div>
          )}
        </div>
      )}

      {ready && <SummaryCards summary={data.summary} selectedStatus={filters.status} />}

      {ready && data.hospitalError && <p className="cp-muted" role="alert">{data.hospitalError}</p>}

      {ready && (
        <div className="cp-leaderboard-block">
          {activeLabel ? <p className="cp-active-count">{activeLabel}</p> : null}
          <Leaderboard employees={data.employees} onOpen={setDetailName} />
        </div>
      )}

      {ready && <PerformanceTrend trend={data.trend} employees={data.employees} roster={roster} />}

      {ready && <FollowUpTable employees={data.employees} />}

      {ready && (
      <section className="cp-exec" aria-label="Executive summary">
        <TopPerformer highlights={data.highlights} onOpen={setDetailName} />
        <Highlights highlights={data.highlights} onOpen={setDetailName} />
        <Attention rows={data.attention} onOpen={setDetailName} />
      </section>
      )}

      {ready && (
      <EmployeeDetail
        row={detail}
        ranked={data.employees.filter((row) => row.rank).length}
        leads={detail ? data.leadsByEmployee[detail.name] || [] : []}
        listKey={[filters.preset, filters.start, filters.end, filters.employee, filters.status, filters.plan, filters.source].join("|")}
        trend={data.trend}
        period={period}
        today={todayInput()}
        onClose={() => setDetailName(null)}
      />
      )}
    </div>
  );
}

function FilterBar({ applied, onApply, options }) {
  const set = (key) => (event) => onApply({ ...applied, [key]: event.target.value });

  const choosePreset = (event) => {
    const preset = event.target.value;
    if (preset !== "custom" || (applied.start && applied.end)) {
      onApply({ ...applied, preset });
      return;
    }
    const today = todayInput();
    onApply({ ...applied, preset, start: `${today.slice(0, 8)}01`, end: today });
  };

  return (
    <form className={`cp-filters${applied.preset === "custom" ? " is-custom" : ""}`} onSubmit={(event) => event.preventDefault()}>
      <Select label="Date range" value={applied.preset} onChange={choosePreset}>
        {PERIOD_PRESETS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </Select>
      {applied.preset === "custom" && (
        <>
          <Input type="date" label="From" value={applied.start} max={applied.end || toDay(new Date())} onChange={set("start")} />
          <Input type="date" label="To" value={applied.end} min={applied.start} onChange={set("end")} />
        </>
      )}
      <SearchSelect
        label="CRM employee"
        value={applied.employee}
        onChange={(employee) => onApply({ ...applied, employee })}
        options={options.employees}
        allLabel="All Employees"
        emptyText="No employee found"
      />
      <Select label="Lead status" value={applied.status} onChange={set("status")}>
        <option value="all">All</option>
        {CRM_ANALYTICS_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
      </Select>
      <Select label="Plan" value={applied.plan} onChange={set("plan")}>
        <option value="all">All</option>
        {options.plans.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
      </Select>
      <Select label="Lead source" value={applied.source} onChange={set("source")}>
        <option value="all">All</option>
        {options.sources.map((source) => <option key={source} value={source}>{source}</option>)}
      </Select>
      <div className="cp-filter-actions">
        <Button variant="secondary" onClick={() => onApply(DEFAULT_FILTERS)}>Reset</Button>
      </div>
    </form>
  );
}

function SummaryCards({ summary, selectedStatus }) {
  const cards = [
    { key: "leads", icon: Users, label: "Leads", value: summary.leads, hint: "Leads received in the selected period" },
    { key: "contacted", icon: PhoneCall, label: "Contacted", value: summary.contacted, status: "Contacted" },
    { key: "agreed", icon: Handshake, label: "Agreed", value: summary.agreed, status: "Agreed" },
    {
      key: "registered",
      icon: BadgeCheck,
      label: "Registered",
      value: summary.registered,
      status: "Registered",
      note: `${formatRate(summary.conversionRate)} conversion`,
      hint: "Registered leads divided by leads received in this period",
    },
    { key: "not-interested", icon: UserX, label: "Not interested", value: summary.notInterested, status: "Not Interested" },
    {
      key: "revenue",
      icon: IndianRupee,
      label: "Revenue",
      value: formatCurrency(summary.revenue),
      note: `${formatCurrency(summary.avgRevenue)} avg`,
      hint: "Paid invoices for registered leads in this period",
    },
    {
      key: "overdue",
      icon: AlarmClock,
      label: "Overdue",
      value: summary.overdue,
      tone: summary.overdue ? "late" : "",
      hint: "Open leads past their follow-up date, as of today",
    },
    { key: "total", icon: Layers, label: "Total", value: summary.total, hint: "Leads in the filtered dataset" },
  ];
  return (
    <section className="cp-kpis" aria-label="Performance summary">
      {cards.map((card) => (
        <Kpi key={card.key} {...card} selected={Boolean(card.status) && card.status === selectedStatus} />
      ))}
    </section>
  );
}

function Kpi({ icon: Icon, label, value, note, hint, tone = "", selected = false }) {
  return (
    <article
      className={`cp-kpi${tone ? ` ${tone}` : ""}${selected ? " is-selected" : ""}`}
      title={hint || label}
      aria-current={selected ? "true" : undefined}
    >
      <header>
        <Icon size={13} aria-hidden="true" />
        <span>{label}</span>
      </header>
      <strong>{value}</strong>
      <small>{note || "\u00a0"}</small>
    </article>
  );
}

function TopPerformer({ highlights, onOpen }) {
  const top = highlights.top;
  return (
    <article className="cp-card cp-top">
      <header className="cp-exec-head">
        <Trophy size={16} aria-hidden="true" />
        <h2>Top performer</h2>
      </header>
      {top ? (
        <>
          <button type="button" className="cp-top-name" onClick={() => onOpen(top.name)}>{top.name}</button>
          <div className="cp-top-meta">
            <span>{top.role}</span>
            <RatingBadge rating={top.rating} />
            <span>Score {top.score}</span>
          </div>
          <dl className="cp-top-stats">
            <div><dt>Conversions</dt><dd>{top.conversions}</dd></div>
            <div><dt>Revenue</dt><dd>{formatCurrency(top.revenue)}</dd></div>
            <div><dt>Conversion rate</dt><dd>{formatRate(top.conversionRate)}</dd></div>
          </dl>
          <p className="cp-card-note">Chosen by overall score, so lead count alone does not decide it.</p>
        </>
      ) : highlights.leader ? (
        <>
          <p className="cp-empty-block">No conversions yet from leads received in this period.</p>
          <p className="cp-card-note">
            Leading on score: <button type="button" className="cp-link" onClick={() => onOpen(highlights.leader.name)}>{highlights.leader.name}</button> ({highlights.leader.score})
          </p>
        </>
      ) : (
        <p className="cp-empty-block">No employee received leads in this period.</p>
      )}
    </article>
  );
}

function Highlights({ highlights, onOpen }) {
  const items = [
    ["Most leads", highlights.mostLeads, (row) => `${row.leads} lead${row.leads === 1 ? "" : "s"}`],
    ["Highest conversion rate", highlights.bestRate, (row) => `${formatRate(row.conversionRate)} · ${row.conversions} of ${row.leads}`],
    ["Highest revenue", highlights.topRevenue, (row) => formatCurrency(row.revenue)],
  ];
  return (
    <div className="cp-highlights">
      {items.map(([label, row, describe]) => (
        <article key={label} className="cp-card cp-highlight">
          <span>{label}</span>
          {row ? (
            <>
              <button type="button" className="cp-link" onClick={() => onOpen(row.name)}>{row.name}</button>
              <strong>{describe(row)}</strong>
            </>
          ) : <strong className="cp-muted">—</strong>}
        </article>
      ))}
    </div>
  );
}

function Attention({ rows, onOpen }) {
  return (
    <article className="cp-card cp-attention">
      <header className="cp-exec-head">
        <TriangleAlert size={16} aria-hidden="true" />
        <h2>Needs attention</h2>
      </header>
      {rows.length === 0 ? (
        <p className="cp-empty-block">Everyone is on track for this period.</p>
      ) : (
        <ul>
          {rows.map((row) => (
            <li key={row.name}>
              <button type="button" className="cp-link" onClick={() => onOpen(row.name)}>{row.name}</button>
              <ul>{row.attention.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
