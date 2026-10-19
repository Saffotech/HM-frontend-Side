import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import EmptyState from "../../../../shared/components/EmptyState";
import { formatCompactCurrency, formatCurrency } from "../../../../shared/utils/formatCurrency";
import ChartTooltip from "./ChartTooltip";
import "./RevenueChart.css";

export default function RevenueChart({ data }) {
  const rows = Array.isArray(data) ? data : [];

  return (
    <section className="card card-pad chart-card wide">
      <h2>Revenue trend</h2>
      <p className="panel-copy">Paid demonstration invoices grouped by month. These are not live collections.</p>
      <div className="chart-box">
        {rows.length === 0 ? (
          <EmptyState title="No revenue data" message="This chart stays empty until a billing API is connected." />
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows}>
            <CartesianGrid stroke="#e1e7ef" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#667895", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#667895", fontSize: 12 }} axisLine={false} tickLine={false} width={80} tickFormatter={formatCompactCurrency} />
            <Tooltip content={<ChartTooltip valueFormatter={formatCurrency} />} />
            <Line type="monotone" dataKey="revenue" name="Paid revenue" stroke="#13877f" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
