import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartTooltip from "../../components/charts/ChartTooltip";
import EmptyState from "../../../../shared/components/EmptyState";
import { formatCompactCurrency, formatCurrency } from "../../../../shared/utils/formatCurrency";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

function ChartFrame({ title, description, children, label }) {
  return (
    <section className="card card-pad chart-card dash-chart" aria-label={label}>
      <h2>{title}</h2>
      <p className="panel-copy">{description}</p>
      <div className="chart-box">{children}</div>
    </section>
  );
}

export function RegistrationChart({ data }) {
  const reducedMotion = usePrefersReducedMotion();
  const ready = Array.isArray(data) && data.length > 0;

  return (
    <ChartFrame
      title="New registrations"
      label="New hospital registrations by month"
      description="Hospitals whose registration date falls in that month. This is not a cumulative total."
    >
      {ready ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e1e7ef" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#667895", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              minTickGap={28}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              width={36}
              tick={{ fill: "#667895", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip cursor={{ fill: "rgba(19, 135, 127, 0.08)" }} content={<ChartTooltip />} />
            <Bar dataKey="tenants" name="Registrations" fill="#13877f" radius={[6, 6, 0, 0]} isAnimationActive={!reducedMotion} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState title="No registration data" message="Months appear after a hospital is registered." />
      )}
    </ChartFrame>
  );
}

export function RevenueTrendChart({ data }) {
  const reducedMotion = usePrefersReducedMotion();
  const ready = Array.isArray(data) && data.length > 0;

  return (
    <ChartFrame
      title="Revenue trend"
      label="Paid demonstration revenue by month"
      description="Paid invoices grouped by invoice month. This chart fills in when a billing API is connected."
    >
      {ready ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e1e7ef" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#667895", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              minTickGap={28}
              interval="preserveStartEnd"
            />
            <YAxis
              width={80}
              tick={{ fill: "#667895", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatCompactCurrency}
            />
            <Tooltip content={<ChartTooltip valueFormatter={formatCurrency} />} />
            <Line
              type="linear"
              dataKey="revenue"
              name="Paid revenue"
              stroke="#13877f"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              isAnimationActive={!reducedMotion}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState title="No revenue data" message="This chart stays empty until a billing API is connected." />
      )}
    </ChartFrame>
  );
}
