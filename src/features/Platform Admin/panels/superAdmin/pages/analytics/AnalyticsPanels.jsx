import { useEffect, useId, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Button from "../../../../shared/components/Button";
import { CRM_ANALYTICS_STATUSES } from "../../../../shared/api/platformCrmAnalytics";
import { formatCompactCurrency, formatCurrency } from "../../../../shared/utils/formatCurrency";

const PLAN_COLORS = ["#13877f", "#4778dc", "#e8a83e", "#8b6cc4", "#7d8ea3"];
const AXIS = { fill: "#667895", fontSize: 12 };
const GRID = "#e6ebf2";

const STATUS_TONE = {
  Active: "is-active",
  Trial: "is-trial",
  Suspended: "is-suspended",
};

function formatCount(value) {
  const number = Number(value);
  return (Number.isFinite(number) ? number : 0).toLocaleString("en-IN");
}

function ChartEmpty({ title, message }) {
  return (
    <div className="pa-empty">
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

function AnalyticsTip({ active, payload, label, formatValue, valueLabel }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const heading = label || item.name;
  return (
    <div className="pa-tip">
      <strong className="pa-tip-label">{heading}</strong>
      <div className="pa-tip-row">
        <span>{valueLabel}</span>
        <strong>{formatValue ? formatValue(item.value) : formatCount(item.value)}</strong>
      </div>
    </div>
  );
}

function PanelHead({ id, title, copy }) {
  return (
    <header className="pa-head">
      <h2 id={id}>{title}</h2>
      {copy ? <p>{copy}</p> : null}
    </header>
  );
}

function Plot({ className = "", height, label, children }) {
  return (
    <div className={`pa-plot${className ? ` ${className}` : ""}`} style={height ? { height } : undefined} role="img" aria-label={label}>
      <div className="pa-plot-fill" aria-hidden="true">{children}</div>
    </div>
  );
}

export function GrowthPanel({ data }) {
  const titleId = useId();
  const rows = Array.isArray(data) ? data : [];
  const label = rows.length
    ? `Tenant growth. ${rows.map((row) => `${row.label}: ${formatCount(row.tenants)}`).join(", ")}`
    : "Tenant growth. No registration data";

  return (
    <section className="pa-card" aria-labelledby={titleId}>
      <PanelHead id={titleId} title="Tenant growth" copy="New hospital registrations by month, counted from the tenant records." />
      {rows.length === 0 ? (
        <ChartEmpty title="No registration data" message="Months appear after a hospital is registered." />
      ) : (
        <Plot className="is-growth" label={label}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="32%">
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval={0} tickMargin={8} />
              <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} width={44} domain={[0, (max) => Math.max(max, 1) * 1.12]} />
              <Tooltip cursor={{ fill: "rgba(19, 135, 127, 0.06)" }} content={<AnalyticsTip valueLabel="Registrations" />} />
              <Bar dataKey="tenants" name="Registrations" fill="#13877f" maxBarSize={32} minPointSize={3} radius={[4, 4, 0, 0]} activeBar={{ fill: "#0c716a" }} />
            </BarChart>
          </ResponsiveContainer>
        </Plot>
      )}
    </section>
  );
}

export function PlanPanel({ data }) {
  const titleId = useId();
  const rows = Array.isArray(data) ? data : [];
  const label = rows.length
    ? `Plan distribution. ${rows.map((row) => `${row.name}: ${formatCount(row.value)}`).join(", ")}`
    : "Plan distribution. No plan data";

  return (
    <section className="pa-card" aria-labelledby={titleId}>
      <PanelHead id={titleId} title="Plan distribution" copy="Hospitals grouped by the subscription plan on each tenant record." />
      {rows.length === 0 ? (
        <ChartEmpty title="No plan data" message="Plan groups appear after a hospital is registered." />
      ) : (
        <div className="pa-plan">
          <Plot className="is-donut" label={label}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="84%"
                  paddingAngle={rows.length > 1 ? 1.5 : 0}
                  stroke="#fff"
                  strokeWidth={2}
                  startAngle={90}
                  endAngle={-270}
                >
                  {rows.map((entry, index) => <Cell key={entry.name} fill={PLAN_COLORS[index % PLAN_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<AnalyticsTip valueLabel="Hospitals" />} />
              </PieChart>
            </ResponsiveContainer>
          </Plot>
          <ul className="pa-legend">
            {rows.map((entry, index) => (
              <li key={entry.name}>
                <span className="pa-swatch" style={{ background: PLAN_COLORS[index % PLAN_COLORS.length] }} aria-hidden="true" />
                <span className="pa-legend-name">{entry.name}</span>
                <span className="pa-legend-count">{formatCount(entry.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function StatusPanel({ rows }) {
  const titleId = useId();
  const items = Array.isArray(rows) ? rows : [];
  return (
    <section className="pa-card" aria-labelledby={titleId}>
      <PanelHead id={titleId} title="Hospital status" copy="Active, trial, and suspended hospitals on the server." />
      <ul className="pa-metrics">
        {items.map((row) => (
          <li key={row.name} className="pa-metric">
            <span className="pa-metric-label">
              <span className={`pa-dot ${STATUS_TONE[row.name] || "is-other"}`} aria-hidden="true" />
              {row.name}
            </span>
            <strong>{formatCount(row.value)}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

function useElementWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const update = () => {
      const next = Math.round(node.getBoundingClientRect().width);
      setWidth((current) => (current === next ? current : next));
    };
    update();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

function wrapLabel(value, maxChars) {
  const limit = Math.max(8, maxChars);
  const text = String(value ?? "").trim();
  if (!text) return [""];
  const words = text.split(/\s+/).flatMap((word) => {
    if (word.length <= limit) return [word];
    const parts = [];
    for (let index = 0; index < word.length; index += limit) parts.push(word.slice(index, index + limit));
    return parts;
  });
  if (words.length === 1) return words;
  const lines = [];
  let current = "";
  words.forEach((word) => {
    if (!current) {
      current = word;
      return;
    }
    if (`${current} ${word}`.length <= limit) {
      current = `${current} ${word}`;
      return;
    }
    lines.push(current);
    current = word;
  });
  if (current) lines.push(current);
  return lines;
}

function LocationTick({ x, y, payload, maxChars }) {
  const lines = wrapLabel(payload?.value, maxChars);
  const lineHeight = 14;
  const firstDy = lines.length === 1 ? 4 : 4 - ((lines.length - 1) * lineHeight) / 2;
  return (
    <text x={x - 6} y={y} textAnchor="end" fill="#142d52" fontSize="12">
      {lines.map((line, index) => (
        <tspan key={`${line}-${index}`} x={x - 6} dy={index === 0 ? firstDy : lineHeight}>{line}</tspan>
      ))}
    </text>
  );
}

export function LocationPanel({ data }) {
  const titleId = useId();
  const rows = Array.isArray(data) ? data : [];
  const [plotRef, plotWidth] = useElementWidth();
  const plot = plotWidth || 640;
  const longestWord = rows.reduce((max, row) => {
    const words = String(row.name || "").split(/\s+/);
    return Math.max(max, ...words.map((word) => word.length));
  }, 0);
  const preferred = Math.max(112, Math.round(plot * 0.34), Math.ceil(longestWord * 6.8) + 18);
  const axisWidth = Math.min(preferred, Math.max(112, plot - 148));
  const maxChars = Math.max(8, Math.floor((axisWidth - 16) / 6.8));
  const maxLines = rows.reduce((max, row) => Math.max(max, wrapLabel(row.name, maxChars).length), 1);
  const plotHeight = Math.max(132, rows.length * Math.max(34, 12 + maxLines * 16) + 36);
  const label = rows.length
    ? `Tenant distribution by location. ${rows.map((row) => `${row.name}: ${formatCount(row.value)}`).join(", ")}`
    : "Tenant distribution by location. No location data";

  return (
    <section className="pa-card" aria-labelledby={titleId}>
      <PanelHead id={titleId} title="Tenant distribution by location" copy="Hospitals counted by state from the records in the selected period." />
      <div className="pa-measure" ref={plotRef}>
        {rows.length === 0 ? (
          <ChartEmpty title="No location data" message="States appear after a hospital is registered." />
        ) : (
          <Plot height={plotHeight} label={label}>
            {plotWidth > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }} barCategoryGap={8}>
                  <CartesianGrid stroke={GRID} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} domain={[0, (max) => Math.max(max, 1) * 1.08]} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={axisWidth}
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                    tick={(tickProps) => <LocationTick {...tickProps} maxChars={maxChars} />}
                  />
                  <Tooltip cursor={{ fill: "rgba(19, 135, 127, 0.06)" }} content={<AnalyticsTip valueLabel="Hospitals" />} />
                  <Bar dataKey="value" name="Hospitals" fill="#13877f" maxBarSize={12} minPointSize={3} radius={[0, 3, 3, 0]} activeBar={{ fill: "#0c716a" }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Plot>
        )}
      </div>
    </section>
  );
}

export function LeadsPanel({ statuses, loading, error, onRetry }) {
  const titleId = useId();
  return (
    <section className="pa-card" aria-labelledby={titleId}>
      <PanelHead
        id={titleId}
        title="Company-wide leads"
        copy="Lead counts for the whole company. This does not replace the CRM lead list."
      />
      {loading && <p className="pa-inline">Loading lead counts.</p>}
      {error && (
        <div className="pa-alert" role="alert">
          <p>{error}</p>
          <Button variant="secondary" onClick={onRetry}>Try again</Button>
        </div>
      )}
      {statuses && (
        <ul className="pa-leads">
          {CRM_ANALYTICS_STATUSES.map((status) => (
            <li key={status} className="pa-lead">
              <span>{status}</span>
              <strong>{formatCount(statuses[status])}</strong>
            </li>
          ))}
          <li className="pa-lead is-total">
            <span>Total</span>
            <strong>{formatCount(statuses.total)}</strong>
          </li>
        </ul>
      )}
    </section>
  );
}

export function InvoicePanel({ data, loading, error, onRetry }) {
  const titleId = useId();
  const rows = Array.isArray(data) ? data : [];
  const peak = rows.reduce((max, row) => Math.max(max, Number(row.revenue) || 0), 0);
  const label = rows.length
    ? `Subscription invoices. ${rows.map((row) => `${row.label}: ${formatCurrency(row.revenue)}`).join(", ")}`
    : "Subscription invoices";

  return (
    <section className="pa-card" aria-labelledby={titleId}>
      <PanelHead
        id={titleId}
        title="Subscription invoices"
        copy="Collected, pending, and overdue amounts. Failed invoices are not included."
      />
      {loading && <p className="pa-inline">Loading invoice totals.</p>}
      {error && (
        <div className="pa-alert" role="alert">
          <p>{error}</p>
          <Button variant="secondary" onClick={onRetry}>Try again</Button>
        </div>
      )}
      {!loading && !error && rows.length === 0 && (
        <ChartEmpty title="No revenue totals" message="Company-wide invoice totals appear here." />
      )}
      {!loading && !error && rows.length > 0 && (
        <Plot className="is-invoices" label={label}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 18, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="label"
                tick={AXIS}
                axisLine={false}
                tickLine={false}
                interval={0}
                tickMargin={10}
                padding={{ left: 28, right: 28 }}
              />
              <YAxis
                tick={AXIS}
                axisLine={false}
                tickLine={false}
                width={76}
                tickFormatter={formatCompactCurrency}
                {...(peak === 0 ? { domain: [0, 1], ticks: [0] } : { domain: [0, (max) => max * 1.16] })}
              />
              <Tooltip
                cursor={{ stroke: "#d5dee8", strokeWidth: 1 }}
                content={<AnalyticsTip valueLabel="Amount" formatValue={formatCurrency} />}
              />
              <Line
                type="linear"
                dataKey="revenue"
                name="Amount"
                stroke="#13877f"
                strokeWidth={2}
                dot={{ r: 5, fill: "#13877f", stroke: "#fff", strokeWidth: 2, clipDot: false }}
                activeDot={{ r: 7, fill: "#0c716a", stroke: "#fff", strokeWidth: 2 }}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        </Plot>
      )}
    </section>
  );
}
