const SEVERITY_MAP = {
  medium: { label: 'Medium', className: 'nurse-badge--severity-medium' },
  high: { label: 'High', className: 'nurse-badge--severity-high' },
  critical: { label: 'Critical', className: 'nurse-badge--severity-critical' },
};

export default function NurseSeverityBadge({ severity }) {
  const key = severity?.toLowerCase();
  const meta = SEVERITY_MAP[key] || { label: severity || '—', className: 'nurse-badge--draft' };
  return <span className={`nurse-badge ${meta.className}`}>{meta.label}</span>;
}
