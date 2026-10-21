import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartTooltip from "../../../components/charts/ChartTooltip";
import "../../../components/charts/TenantStatusChart.css";
import { formatCompactCurrency, formatCurrency } from "../../../../../shared/utils/formatCurrency";

const EMPLOYEE_COLORS = ["#13877f", "#4778dc", "#c9843a", "#8a5cc2", "#d0546b", "#5b6b84"];
const TREND_METRICS = [
  ["leads", "Leads"],
  ["conversions", "Conversions"],
  ["revenue", "Revenue"],
];
const MAX_TREND_EMPLOYEES = 4;
const AXIS_TICK = { fill: "#667895", fontSize: 12 };

function colorFor(name, roster) {
  return EMPLOYEE_COLORS[Math.max(0, roster.indexOf(name)) % EMPLOYEE_COLORS.length];
}

export function PerformanceTrend({ trend, employees, roster }) {
  const [metric, setMetric] = useState("conversions");
  const ranked = employees.filter((row) => row.rank).map((row) => row.name);
  const defaults = (ranked.length ? ranked : employees.map((row) => row.name)).slice(0, 3);
  const [picked, setPicked] = useState(null);
  const available = employees.map((row) => row.name);
  const selected = (picked || defaults).filter((name) => available.includes(name));
  const isRevenue = metric === "revenue";

  const toggle = (name) => {
    const current = selected;
    if (current.includes(name)) setPicked(current.filter((item) => item !== name));
    else if (current.length < MAX_TREND_EMPLOYEES) setPicked([...current, name]);
  };

  return (
    <section className="cp-card">
      <header className="cp-card-head cp-trend-head">
        <div>
          <h2>Employee performance trend</h2>
          <p>Last 6 months, by the month each lead was received. Compare up to {MAX_TREND_EMPLOYEES} employees.</p>
        </div>
        <div className="cp-segment" role="group" aria-label="Trend metric">
          {TREND_METRICS.map(([key, label]) => (
            <button key={key} type="button" className={metric === key ? "active" : ""} aria-pressed={metric === key} onClick={() => setMetric(key)}>{label}</button>
          ))}
        </div>
      </header>
      <div className="cp-chips" role="group" aria-label="Employees on the chart">
        {available.map((name) => {
          const on = selected.includes(name);
          return (
            <button
              key={name}
              type="button"
              className={`cp-chip ${on ? "on" : ""}`}
              aria-pressed={on}
              disabled={!on && selected.length >= MAX_TREND_EMPLOYEES}
              onClick={() => toggle(name)}
            >
              <i style={{ background: colorFor(name, roster) }} />
              {name}
            </button>
          );
        })}
      </div>
      {selected.length === 0 ? (
        <p className="cp-empty-block">Select at least one employee to see the trend.</p>
      ) : (
        <div className="cp-chart" style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend[metric]} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#e8edf3" vertical={false} />
              <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={isRevenue ? 72 : 36}
                tickFormatter={isRevenue ? formatCompactCurrency : undefined}
              />
              <Tooltip content={<ChartTooltip valueFormatter={isRevenue ? formatCurrency : undefined} />} />
              {selected.map((name) => (
                <Line isAnimationActive={false} key={name} type="monotone" dataKey={name} name={name} stroke={colorFor(name, roster)} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export function EmployeeTrend({ trend, name }) {
  const data = trend.leads.map((month, index) => ({
    label: month.label,
    Leads: month[name] || 0,
    Conversions: trend.conversions[index][name] || 0,
  }));
  return (
    <div className="cp-chart" style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#e8edf3" vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
          <Tooltip cursor={{ fill: "#f3f6f9" }} content={<ChartTooltip />} />
          <Bar isAnimationActive={false} dataKey="Leads" fill="#9fb3cc" radius={[3, 3, 0, 0]} barSize={18} />
          <Bar isAnimationActive={false} dataKey="Conversions" fill="#13877f" radius={[3, 3, 0, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
