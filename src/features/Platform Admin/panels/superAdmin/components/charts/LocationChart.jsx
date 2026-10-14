import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartTooltip from "./ChartTooltip";
import "./TenantStatusChart.css";

export default function LocationChart({ data }) {
  return (
    <section className="card card-pad chart-card wide">
      <h2>Tenant distribution by location</h2>
      <p className="panel-copy">Hospitals counted by state from the records in the selected period.</p>
      <div className="chart-box" style={{ height: Math.max(260, data.length * 32) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
            <CartesianGrid stroke="#e1e7ef" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fill: "#667895", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fill: "#142d52", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="value" name="Hospitals" fill="#4778dc" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
