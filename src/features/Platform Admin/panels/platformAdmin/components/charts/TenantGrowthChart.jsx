import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import EmptyState from "../../../../shared/components/EmptyState";
import ChartTooltip from "./ChartTooltip";
import "./TenantGrowthChart.css";

export default function TenantGrowthChart({ data, title = "Tenant growth" }) {
  const rows = Array.isArray(data) ? data : [];

  return (
    <section className="card card-pad chart-card">
      <h2>{title}</h2>
      <p className="panel-copy">New hospital registrations by month, counted from the tenant records.</p>
      <div className="chart-box">
        {rows.length === 0 ? (
          <EmptyState title="No registration data" message="Months appear after a hospital is registered." />
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid stroke="#e1e7ef" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#667895", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: "#667895", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="tenants" name="Registrations" fill="#13877f" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
