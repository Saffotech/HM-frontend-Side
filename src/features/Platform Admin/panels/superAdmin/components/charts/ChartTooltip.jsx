export default function ChartTooltip({ active, payload, label, valueFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label && <strong>{label}</strong>}
      {payload.map((item) => (
        <div key={item.name}>{item.name}: {valueFormatter ? valueFormatter(item.value) : item.value}</div>
      ))}
    </div>
  );
}
