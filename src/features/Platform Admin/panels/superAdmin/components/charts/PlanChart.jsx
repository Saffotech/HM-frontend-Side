import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import ChartTooltip from "./ChartTooltip";
import "./TenantStatusChart.css";

const palette = ["#13877f", "#4778dc", "#e8a83e", "#8b6cc4", "#dc5252"];

export default function PlanChart({
  data,
  title = "Plan distribution",
  description = "Hospitals grouped by the subscription plan on each tenant record.",
}) {
  return (
    <section className="card card-pad chart-card">
      <h2>{title}</h2>
      <p className="panel-copy">{description}</p>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={3}>
              {data.map((entry, index) => <Cell key={entry.name} fill={palette[index % palette.length]} />)}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="chart-legend">
        {data.map((entry, index) => (
          <li key={entry.name}>
            <i style={{ background: palette[index % palette.length] }} />
            <span>{entry.name}</span>
            <strong>{entry.value}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
