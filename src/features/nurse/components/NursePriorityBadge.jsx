export default function NursePriorityBadge({ priority }) {
  const p = priority?.toLowerCase();
  if (p === 'emergency') return <span className="nurse-badge nurse-badge--emergency">Emergency</span>;
  if (p === 'urgent') return <span className="nurse-badge nurse-badge--urgent">Urgent</span>;
  if (p === 'normal') return <span className="nurse-badge nurse-badge--normal">Normal</span>;
  if (!priority) return <span className="nurse-badge nurse-badge--normal">Normal</span>;
  const label = String(priority).replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  return <span className="nurse-badge nurse-badge--normal">{label}</span>;
}
