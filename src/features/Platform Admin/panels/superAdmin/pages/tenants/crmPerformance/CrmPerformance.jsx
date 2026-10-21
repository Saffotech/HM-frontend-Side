import { useState } from "react";
import {
  AlarmClock, ArrowDownRight, ArrowUpRight, BadgeCheck, IndianRupee, Minus, Percent, PhoneCall, TriangleAlert, Trophy, UserCheck, Users, Wallet,
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
import { useCrmFilterOptions, useCrmPerformance } from "./useCrmPerformance";
import "./CrmPerformance.css";

const REQUEST_STATUSES = ["New", "Contacted", "Registered", "Not Interested"];
const DEFAULT_FILTERS = { preset: "month", start: "", end: "", employee: "all", status: "all", plan: "all", source: "all" };

export default function CrmPerformance() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [detailName, setDetailName] = useState(null);
  const options = useCrmFilterOptions();
  const data = useCrmPerformance(filters);
  const { team, period } = data;
  const roster = options.employees;
  const detail = data.employees.find((row) => row.name === detailName) || null;
  const compare = period.compareLabel;

  return (
    <div className="cp-page">
      <header className="cp-page-head">
        <div>
          <h2>Employee performance</h2>
          {data.billingNote && <p className="cp-muted">{data.billingNote}</p>}
          {data.hospitalError && <p className="cp-muted" role="alert">{data.hospitalError}</p>}
        </div>
      </header>

      <FilterBar applied={filters} onApply={setFilters} options={options} />

      <section className="cp-kpis" aria-label="Team summary">
        <Kpi icon={Users} label="Total leads" value={team.current.leads} change={delta(team.current.leads, team.previous.leads)} compare={compare} />
        <Kpi icon={PhoneCall} label="Contacted" value={team.current.contacted} change={delta(team.current.contacted, team.previous.contacted)} compare={compare} />
        <Kpi icon={BadgeCheck} label="Conversions" value={team.current.conversions} change={delta(team.current.conversions, team.previous.conversions)} compare={compare} />
        <Kpi icon={Percent} label="Conv. rate" fullLabel="Conversion rate" value={formatRate(team.current.conversionRate)} change={pointsDelta(team.current.conversionRate, team.previous.conversionRate, team.current.leads, team.previous.leads)} compare={compare} />
        <Kpi icon={IndianRupee} label="Revenue" value={formatCurrency(team.current.revenue)} change={delta(team.current.revenue, team.previous.revenue)} compare={compare} />
        <Kpi icon={Wallet} label="Avg deal" fullLabel="Average revenue per conversion" value={team.current.conversions ? formatCurrency(team.current.avgRevenue) : "—"} change={team.current.conversions && team.previous.conversions ? delta(team.current.avgRevenue, team.previous.avgRevenue) : null} compare={compare} />
        <Kpi icon={AlarmClock} label="Overdue" fullLabel="Overdue follow-ups" value={team.overdueNow} tone={team.overdueNow ? "late" : ""} note="As of today" hint="Open leads past their follow-up date, as of today" />
        <Kpi icon={UserCheck} label="Employees" fullLabel="Active CRM employees" value={team.current.activeEmployees} change={delta(team.current.activeEmployees, team.previous.activeEmployees)} compare={compare} />
      </section>

      <Leaderboard employees={data.employees} onOpen={setDetailName} />

      <PerformanceTrend trend={data.trend} employees={data.employees} roster={roster} />

      <FollowUpTable employees={data.employees} onOpen={setDetailName} />

      <section className="cp-exec" aria-label="Executive summary">
        <TopPerformer highlights={data.highlights} onOpen={setDetailName} />
        <Highlights highlights={data.highlights} onOpen={setDetailName} />
        <Attention rows={data.attention} onOpen={setDetailName} />
      </section>

      <EmployeeDetail
        row={detail}
        ranked={data.employees.filter((row) => row.rank).length}
        leads={detail ? data.leadsByEmployee[detail.name] || [] : []}
        trend={data.trend}
        period={period}
        today={todayInput()}
        onClose={() => setDetailName(null)}
      />
    </div>
  );
}

function FilterBar({ applied, onApply, options }) {
  const [draft, setDraft] = useState(applied);
  const set = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  const customIncomplete = draft.preset === "custom" && (!draft.start || !draft.end);
  const dirty = JSON.stringify(draft) !== JSON.stringify(applied);

  const choosePreset = (event) => {
    const preset = event.target.value;
    setDraft((current) => {
      if (preset !== "custom" || (current.start && current.end)) return { ...current, preset };
      const today = todayInput();
      return { ...current, preset, start: `${today.slice(0, 8)}01`, end: today };
    });
  };

  const reset = () => {
    setDraft(DEFAULT_FILTERS);
    onApply(DEFAULT_FILTERS);
  };

  return (
    <form className="cp-filters" onSubmit={(event) => { event.preventDefault(); if (!customIncomplete) onApply(draft); }}>
      <Select label="Date range" value={draft.preset} onChange={choosePreset}>
        {PERIOD_PRESETS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </Select>
      {draft.preset === "custom" && (
        <>
          <Input type="date" label="From" value={draft.start} max={draft.end || toDay(new Date())} onChange={set("start")} />
          <Input type="date" label="To" value={draft.end} min={draft.start} onChange={set("end")} />
        </>
      )}
      <SearchSelect
        label="CRM employee"
        value={draft.employee}
        onChange={(employee) => setDraft((current) => ({ ...current, employee }))}
        options={options.employees}
        allLabel="All Employees"
        emptyText="No employee found"
      />
      <Select label="Lead status" value={draft.status} onChange={set("status")}>
        <option value="all">All</option>
        {REQUEST_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
      </Select>
      <Select label="Plan" value={draft.plan} onChange={set("plan")}>
        <option value="all">All</option>
        {options.plans.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
      </Select>
      <Select label="Lead source" value={draft.source} onChange={set("source")}>
        <option value="all">All</option>
        {options.sources.map((source) => <option key={source} value={source}>{source}</option>)}
      </Select>
      <div className="cp-filter-actions">
        <Button type="submit" disabled={!dirty || customIncomplete}>Apply Filters</Button>
        <Button variant="secondary" onClick={reset}>Reset</Button>
      </div>
    </form>
  );
}

function delta(current, previous) {
  if (current === previous) return { dir: "flat", text: "No change" };
  if (!previous) return { dir: "up", text: "Up from 0" };
  const change = ((current - previous) / previous) * 100;
  return { dir: change > 0 ? "up" : "down", text: `${Math.abs(change).toFixed(1)}%` };
}

function pointsDelta(current, previous, currentLeads, previousLeads) {
  if (!currentLeads || !previousLeads) return null;
  const points = (current - previous) * 100;
  if (Math.abs(points) < 0.05) return { dir: "flat", text: "No change" };
  return { dir: points > 0 ? "up" : "down", text: `${Math.abs(points).toFixed(1)} pts` };
}

const ARROWS = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus };

function Kpi({ icon: Icon, label, fullLabel = label, value, change, compare, note, hint, tone = "" }) {
  const Arrow = change ? ARROWS[change.dir] : null;
  const detail = hint || (change ? `${change.text} ${compare}` : "not enough data to compare");
  return (
    <article className={`cp-kpi ${tone}`} title={`${fullLabel}: ${detail}`}>
      <header>
        <Icon size={13} aria-hidden="true" />
        <span>{label}</span>
      </header>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : change ? (
        <small className={`cp-delta cp-delta-${change.dir}`}>
          <Arrow size={12} aria-hidden="true" />
          {change.text}
          <span className="cp-sr-only"> {compare}</span>
        </small>
      ) : <small>No comparison</small>}
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
