import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, Info, Target } from "lucide-react";
import { formatCompactCurrency, formatCurrency } from "../../../shared/utils/formatCurrency";
import { prepareLeads } from "../../../shared/utils/leadMetrics";
import { formatRange, resolvePeriod } from "../../../shared/utils/periods";
import { plural } from "../utils/crmLeads";
import { METRIC_DEFINITIONS, buildMyPerformance } from "../utils/myPerformance";
import { useCrm } from "../workspace/workspace-context";
import "./Performance.css";

const PRESETS = [
  ["week", "This Week"],
  ["month", "This Month"],
  ["lastMonth", "Last Month"],
  ["quarter", "This Quarter"],
  ["custom", "Custom"],
];
const AXIS_TICK = { fill: "#667895", fontSize: 12 };
const rate = (part, total) => (total ? `${((part / total) * 100).toFixed(1)}%` : "—");

function ChartTip({ active, payload, label, money = false }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="crm-chart-tip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.name}><i style={{ background: item.color }} />{item.name}: {money ? formatCurrency(item.value) : item.value}</span>
      ))}
    </div>
  );
}

export default function Performance() {
  const { me, today, leads, hospitals, invoices, billingAvailable } = useCrm();
  const [params, setParams] = useSearchParams();
  const preset = PRESETS.some(([key]) => key === params.get("period")) ? params.get("period") : "month";
  const custom = { start: params.get("from") || today, end: params.get("to") || today };
  const period = useMemo(() => resolvePeriod(preset, custom, today), [preset, custom.start, custom.end, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const update = (changes) => setParams((current) => {
    const next = new URLSearchParams(current);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    return next;
  }, { replace: true });

  const prepared = useMemo(() => prepareLeads({ onboarding: leads, hospitals, invoices, today }), [leads, hospitals, invoices, today]);
  const data = useMemo(() => buildMyPerformance({ leads, prepared, period, today, me }), [leads, prepared, period, today, me]);
  const { current, previous, followUps } = data;
  const resolved = followUps.completed + followUps.missed;
  const funnel = [
    ["Received", current.received.length],
    ["Contacted", current.cohortContacted.length],
    ["Agreed", current.cohortAgreed.length],
    ["Registered", current.cohortRegistered.length],
  ];
  const revenueMonths = data.monthly.some((month) => month.Revenue > 0);

  return (
    <div className="crm-page crm-perf-page">
      <section className="crm-card crm-perf-bar">
        <div className="crm-segment" role="group" aria-label="Period">
          {PRESETS.map(([key, label]) => (
            <button key={key} type="button" className={preset === key ? "active" : ""} aria-pressed={preset === key} onClick={() => update({ period: key === "month" ? "" : key })}>{label}</button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="crm-perf-custom">
            <label className="crm-select"><span>From</span><input type="date" value={custom.start} max={today} onChange={(event) => update({ from: event.target.value })} /></label>
            <label className="crm-select"><span>To</span><input type="date" value={custom.end} max={today} onChange={(event) => update({ to: event.target.value })} /></label>
          </div>
        )}
        <p className="crm-perf-range"><strong>{formatRange(period)}</strong><span>Compared {period.compareLabel}</span></p>
      </section>

      <section className="crm-perf-kpis" aria-label="Performance metrics">
        <div className="crm-perf-row" role="group" aria-label="Sales performance">
          <Metric label="Leads Received" value={current.received.length} before={previous.received.length} hint={`${current.created.length} added by you`} />
          <Metric label="Contacts Logged" value={data.contacts} before={data.previousContacts} hint="Calls, emails, visits" />
          <Metric label="Agreed" value={current.agreed.length} before={previous.agreed.length} hint="Sent to Accounts" />
          <Metric label="Registered" value={current.registered.length} before={previous.registered.length} hint="By Accounts" />
          <Metric label="Conversion Rate" value={rate(current.cohortRegistered.length, current.received.length)} hint={`${current.cohortRegistered.length} of ${plural(current.received.length, "lead")}`} />
        </div>
        <div className="crm-perf-row" role="group" aria-label="Follow-up and revenue">
          <Metric
            label="Follow-up Completion"
            value={rate(followUps.completed, resolved)}
            hint={resolved ? `${followUps.onTime} on time · ${followUps.late} late · ${followUps.missed} missed` : "None fell due"}
            tone={followUps.missed ? "warn" : ""}
          />
          <Metric label="Overdue Now" value={data.overdueNow} hint="Past follow-up date" tone={data.overdueNow ? "alert" : ""} />
          {billingAvailable && data.hasRevenueData ? (
            <Metric label="Attributed Revenue" value={formatCurrency(data.revenue)} before={data.previousRevenue} money hint="Paid invoices" />
          ) : (
            <Metric
              label="Attributed Revenue"
              value="Unavailable"
              hint={billingAvailable ? "No paid invoices yet" : "Platform invoices are not available from the server"}
              tone="muted"
            />
          )}
          <Metric label="Monthly Target" icon={Target} value="Not set" hint="Not configured for you" tone="muted" />
          <Metric
            label="Open Leads"
            value={data.openLeads.length}
            hint={`${data.openLeads.filter((lead) => lead.status === "New").length} new · ${data.openLeads.filter((lead) => lead.status === "Contacted").length} contacted`}
          />
        </div>
      </section>

      <div className="crm-perf-grid">
        <ChartCard title="Leads received, agreed and registered" copy="Last 6 months, by month of the event.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#e8edf3" vertical={false} />
              <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
              <Tooltip cursor={{ fill: "#f3f6f9" }} content={<ChartTip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar isAnimationActive={false} dataKey="Received" fill="#9fb3cc" radius={[3, 3, 0, 0]} barSize={14} />
              <Bar isAnimationActive={false} dataKey="Agreed" fill="#8a6fd6" radius={[3, 3, 0, 0]} barSize={14} />
              <Bar isAnimationActive={false} dataKey="Registered" fill="#13877f" radius={[3, 3, 0, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <section className="crm-card">
          <header className="crm-card-head">
            <div>
              <h2>Funnel for this period</h2>
              <p>Leads received {formatRange(period)}, by the furthest stage reached so far.</p>
            </div>
          </header>
          <div className="crm-card-body">
            {current.received.length === 0 ? (
              <p className="crm-perf-none">No leads were received in this period.</p>
            ) : (
              <ol className="crm-funnel">
                {funnel.map(([label, count]) => (
                  <li key={label}>
                    <div className="crm-funnel-label"><span>{label}</span><strong>{count}</strong><small>{rate(count, current.received.length)}</small></div>
                    <div className="crm-funnel-track"><span style={{ width: `${(count / current.received.length) * 100}%` }} /></div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        <ChartCard title="Follow-up completion" copy="Follow-ups by the month they fell due.">
          {data.monthly.some((month) => month["On time"] || month.Late || month.Missed) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#e8edf3" vertical={false} />
                <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
                <Tooltip cursor={{ fill: "#f3f6f9" }} content={<ChartTip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar isAnimationActive={false} stackId="f" dataKey="On time" fill="#13877f" barSize={22} />
                <Bar isAnimationActive={false} stackId="f" dataKey="Late" fill="#e0a43a" barSize={22} />
                <Bar isAnimationActive={false} stackId="f" dataKey="Missed" fill="#dc5252" radius={[3, 3, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="crm-perf-none">No follow-ups fell due in the last 6 months.</p>}
        </ChartCard>

        <ChartCard title="Attributed revenue" copy="Paid invoices of hospitals from your leads, by invoice date.">
          {!billingAvailable ? (
            <p className="crm-perf-none">Revenue unavailable — there is no platform invoice API yet. Dummy invoices are not used.</p>
          ) : revenueMonths ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#e8edf3" vertical={false} />
                <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={64} tickFormatter={formatCompactCurrency} />
                <Tooltip cursor={{ fill: "#f3f6f9" }} content={<ChartTip money />} />
                <Bar isAnimationActive={false} dataKey="Revenue" fill="#13877f" radius={[3, 3, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="crm-perf-none">Revenue unavailable — none of your hospitals has a paid invoice in the last 6 months.</p>
          )}
        </ChartCard>
      </div>

      <details className="crm-card crm-perf-defs">
        <summary><Info size={15} aria-hidden="true" />How these numbers are calculated</summary>
        <dl>
          {METRIC_DEFINITIONS.map(([term, text]) => (
            <div key={term}><dt>{term}</dt><dd>{text}</dd></div>
          ))}
          <div><dt>Scope</dt><dd>Only leads currently assigned to you. Numbers are worked out in your browser from the CRM records; no history is estimated or filled in.</dd></div>
        </dl>
      </details>
    </div>
  );
}

function Metric({ label, value, before, hint, icon: Icon, tone = "", money = false }) {
  const numeric = typeof before === "number";
  const current = numeric ? (money ? null : Number(value)) : null;
  const diff = numeric ? (money ? null : current - before) : null;
  return (
    <div className={`crm-kpi crm-perf-kpi${tone ? ` is-${tone}` : ""}`}>
      <span className="crm-kpi-label">{Icon && <Icon size={14} aria-hidden="true" />}{label}</span>
      <strong>{value}</strong>
      <small>
        {numeric && !money && diff !== 0 && (
          <span className={`crm-delta ${diff > 0 ? "is-up" : "is-down"}`}>
            {diff > 0 ? <ArrowUpRight size={12} aria-hidden="true" /> : <ArrowDownRight size={12} aria-hidden="true" />}
            {diff > 0 ? `+${diff}` : diff}
          </span>
        )}
        {numeric && money && <span className="crm-delta">Before {formatCompactCurrency(before)} ·</span>}
        {numeric && (money || diff !== 0) && " "}
        {hint}
      </small>
    </div>
  );
}

function ChartCard({ title, copy, children }) {
  return (
    <section className="crm-card">
      <header className="crm-card-head">
        <div>
          <h2>{title}</h2>
          <p>{copy}</p>
        </div>
      </header>
      <div className="crm-perf-chart">{children}</div>
    </section>
  );
}
