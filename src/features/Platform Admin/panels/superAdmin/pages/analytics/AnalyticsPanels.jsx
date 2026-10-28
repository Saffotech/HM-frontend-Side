import { useEffect, useId, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Button from "../../../../shared/components/Button";
import {
  formatCompactCurrency,
  formatCurrency,
} from "../../../../shared/utils/formatCurrency";

const PLAN_COLORS = ["#168a83", "#5278cb", "#d7a33f", "#8872b5", "#8493a5"];
const AXIS = { fill: "#718096", fontSize: 11 };
const GRID = "#e8edf3";

const STATUS_TONE = {
  Active: "is-active",
  Trial: "is-trial",
  Suspended: "is-suspended",
};

const STATUS_LABEL = {
  Active: "Active subscriptions",
  Trial: "Trial",
  Suspended: "Suspended ",
};

function formatCount(value) {
  return Number(value).toLocaleString("en-IN");
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
        <strong>
          {formatValue ? formatValue(item.value) : formatCount(item.value)}
        </strong>
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
    <div
      className={`pa-plot${className ? ` ${className}` : ""}`}
      style={height ? { height } : undefined}
      role="img"
      aria-label={label}
    >
      <div className="pa-plot-fill" aria-hidden="true">
        {children}
      </div>
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
      <PanelHead
        id={titleId}
        title="Tenant growth"
        copy="Hospital registrations by month, based on tenant creation dates."
      />
      {rows.length === 0 ? (
        <ChartEmpty
          title="No registration data"
          message="Monthly registrations appear when tenant records have a creation date."
        />
      ) : (
        <Plot className="is-growth" label={label}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              margin={{ top: 12, right: 12, left: 0, bottom: 2 }}
              barCategoryGap="38%"
            >
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="label"
                tick={AXIS}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                tickMargin={10}
              />
              <YAxis
                allowDecimals={false}
                tick={AXIS}
                axisLine={false}
                tickLine={false}
                width={34}
                domain={[0, (max) => Math.max(max, 1) * 1.12]}
              />
              <Tooltip
                cursor={{ fill: "rgba(19, 135, 127, 0.055)" }}
                content={<AnalyticsTip valueLabel="Registrations" />}
              />
              <Bar
                dataKey="tenants"
                name="Registrations"
                fill="#168a83"
                maxBarSize={34}
                radius={[4, 4, 0, 0]}
                activeBar={{ fill: "#0d716c" }}
              />
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
      <PanelHead
        id={titleId}
        title="Plan distribution"
        copy="Hospitals grouped by the plan saved on each tenant record."
      />
      {rows.length === 0 ? (
        <ChartEmpty
          title="No plan data"
          message="Plan groups appear after a hospital is registered."
        />
      ) : (
        <div className="pa-plan">
          <Plot className="is-donut" label={label}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="66%"
                  outerRadius="86%"
                  paddingAngle={rows.length > 1 ? 2 : 0}
                  stroke="#fff"
                  strokeWidth={2}
                  startAngle={90}
                  endAngle={-270}
                >
                  {rows.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={PLAN_COLORS[index % PLAN_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<AnalyticsTip valueLabel="Hospitals" />} />
              </PieChart>
            </ResponsiveContainer>
          </Plot>
          <ul className="pa-legend">
            {rows.map((entry, index) => (
              <li key={entry.name}>
                <span
                  className="pa-swatch"
                  style={{
                    background: PLAN_COLORS[index % PLAN_COLORS.length],
                  }}
                  aria-hidden="true"
                />
                <span className="pa-legend-name">{entry.name}</span>
                <strong className="pa-legend-count">
                  {formatCount(entry.value)}
                </strong>
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
  const total = items.reduce((sum, row) => sum + (Number(row.value) || 0), 0);
  return (
    <section className="pa-card pa-status-card" aria-labelledby={titleId}>
      <PanelHead
        id={titleId}
        title="Subscription status"
        copy="Total, active, trial, and suspended subscription counts across hospitals."
      />
      <ul className="pa-status-grid">
        <li className="pa-status-item">
          <span className="pa-dot is-other" aria-hidden="true" />
          <span className="pa-status-name">Total</span>
          <strong>{formatCount(total)}</strong>
        </li>
        {items.map((row) => (
          <li key={row.name} className="pa-status-item">
            <span
              className={`pa-dot ${STATUS_TONE[row.name] || "is-other"}`}
              aria-hidden="true"
            />
            <span className="pa-status-name">
              {STATUS_LABEL[row.name] || `${row.name} subscriptions`}
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
    for (let index = 0; index < word.length; index += limit)
      parts.push(word.slice(index, index + limit));
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
    if (`${current} ${word}`.length <= limit) current = `${current} ${word}`;
    else {
      lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  return lines;
}

function LocationTick({ x, y, payload, maxChars }) {
  const lines = wrapLabel(payload?.value, maxChars);
  const lineHeight = 14;
  const firstDy =
    lines.length === 1 ? 4 : 4 - ((lines.length - 1) * lineHeight) / 2;
  return (
    <text x={x - 6} y={y} textAnchor="end" fill="#40516a" fontSize="11">
      {lines.map((line, index) => (
        <tspan
          key={`${line}-${index}`}
          x={x - 6}
          dy={index === 0 ? firstDy : lineHeight}
        >
          {line}
        </tspan>
      ))}
    </text>
  );
}

export function LocationPanel({ data }) {
  const titleId = useId();
  const rows = Array.isArray(data)
    ? [...data].sort(
        (left, right) =>
          right.value - left.value || left.name.localeCompare(right.name),
      )
    : [];
  const [plotRef, plotWidth] = useElementWidth();
  const plot = plotWidth || 640;
  const longestWord = rows.reduce((max, row) => {
    const words = String(row.name || "").split(/\s+/);
    return Math.max(max, ...words.map((word) => word.length));
  }, 0);
  const preferred = Math.max(
    126,
    Math.round(plot * 0.28),
    Math.ceil(longestWord * 6.5) + 16,
  );
  const axisWidth = Math.min(preferred, Math.max(112, plot - 150));
  const maxChars = Math.max(8, Math.floor((axisWidth - 16) / 6.5));
  const maxLines = rows.reduce(
    (max, row) => Math.max(max, wrapLabel(row.name, maxChars).length),
    1,
  );
  const plotHeight = Math.max(
    150,
    rows.length * Math.max(34, 12 + maxLines * 15) + 28,
  );
  const label = rows.length
    ? `Tenant distribution by state, or city when state is unavailable. ${rows.map((row) => `${row.name}: ${formatCount(row.value)}`).join(", ")}`
    : "Tenant distribution by location. No location data";

  return (
    <section className="pa-card" aria-labelledby={titleId}>
      <PanelHead
        id={titleId}
        title="Tenant distribution by location"
        copy="State (or city when state is unavailable), grouped from tenant records."
      />
      <div className="pa-measure" ref={plotRef}>
        {rows.length === 0 ? (
          <ChartEmpty
            title="No location data"
            message="A state or city must be present to include a hospital here."
          />
        ) : (
          <Plot height={plotHeight} label={label}>
            {plotWidth > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rows}
                  layout="vertical"
                  margin={{ top: 4, right: 18, left: 4, bottom: 4 }}
                  barCategoryGap={10}
                >
                  <CartesianGrid stroke={GRID} horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={AXIS}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, (max) => Math.max(max, 1) * 1.08]}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={axisWidth}
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                    tick={(tickProps) => (
                      <LocationTick {...tickProps} maxChars={maxChars} />
                    )}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(19, 135, 127, 0.055)" }}
                    content={<AnalyticsTip valueLabel="Hospitals" />}
                  />
                  <Bar
                    dataKey="value"
                    name="Hospitals"
                    fill="#168a83"
                    maxBarSize={14}
                    radius={[0, 4, 4, 0]}
                    activeBar={{ fill: "#0d716c" }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Plot>
        )}
      </div>
    </section>
  );
}

function FinancialCard({ label, amount, count, tone }) {
  return (
    <li className={`pa-financial-item ${tone}`}>
      <span className="pa-financial-label">{label}</span>
      <strong className="pa-financial-amount">{formatCurrency(amount)}</strong>
      <span className="pa-financial-count">
        {formatCount(count)} {count === 1 ? "invoice" : "invoices"}
      </span>
    </li>
  );
}

export function InvoicePanel({ revenue, loading, error, onRetry }) {
  const titleId = useId();
  return (
    <section className="pa-card pa-invoice-card" aria-labelledby={titleId}>
      <PanelHead
        id={titleId}
        title="Subscription invoice summary"
      />
      {loading && <p className="pa-inline">Loading invoice totals.</p>}
      {error && (
        <div className="pa-alert" role="alert">
          <p>{error}</p>
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
      {!loading && !error && !revenue && (
        <ChartEmpty
          title="No revenue totals"
          message="No invoice totals are available."
        />
      )}
      {!loading && !error && revenue && (
        <>
          <ul className="pa-financial-grid">
            <FinancialCard
              label="Collected"
              amount={revenue.collectedAmount}
              count={revenue.collectedCount}
              tone="tone-collected"
            />
            <FinancialCard
              label="Pending"
              amount={revenue.pendingAmount}
              count={revenue.pendingCount}
              tone="tone-pending"
            />
            <FinancialCard
              label="Overdue"
              amount={revenue.overdueAmount}
              count={revenue.overdueCount}
              tone="tone-overdue"
            />
          </ul>
        </>
      )}
    </section>
  );
}
