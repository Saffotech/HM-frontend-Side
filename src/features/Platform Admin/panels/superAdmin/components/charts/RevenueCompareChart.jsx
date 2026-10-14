import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompactCurrency, formatCurrency, formatPercent, percentChange } from "../../../../shared/utils/formatCurrency";
import ChartTooltip from "./ChartTooltip";
import "./RevenueChart.css";
import "./TenantStatusChart.css";

export default function RevenueCompareChart({ data }) {
  const latest = data[data.length - 1];
  const change = latest ? percentChange(latest.current, latest.previous) : 0;

  return (
    <section className="card card-pad chart-card">
      <h2>Current vs previous revenue</h2>
      <p className="panel-copy">
        {latest
          ? `${latest.label}: current ${formatCurrency(latest.current)} compared with the previous month ${formatCurrency(latest.previous)}${latest.previous ? ` (${formatPercent(change)})` : ""}.`
          : "Paid invoices for each month compared with the month before."}
      </p>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="#e1e7ef" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#667895", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#667895", fontSize: 12 }} axisLine={false} tickLine={false} width={80} tickFormatter={formatCompactCurrency} />
            <Tooltip content={<ChartTooltip valueFormatter={formatCurrency} />} />
            <Bar dataKey="current" name="Current" fill="#13877f" radius={[6, 6, 0, 0]} />
            <Bar dataKey="previous" name="Previous" fill="#4778dc" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="chart-legend">
        <li><i style={{ background: "#13877f" }} /><span>Current</span></li>
        <li><i style={{ background: "#4778dc" }} /><span>Previous month</span></li>
      </ul>
    </section>
  );
}
