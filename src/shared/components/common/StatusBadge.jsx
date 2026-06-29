import './StatusBadge.css';

export default function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase();
  let variant = 'default';

  if (['scheduled', 'occupied'].includes(normalized)) variant = 'info';
  else if (['completed', 'available', 'paid'].includes(normalized)) variant = 'success';
  else if (['cancelled', 'unpaid'].includes(normalized)) variant = 'danger';
  else if (['waiting', 'pending', 'partial'].includes(normalized)) variant = 'warning';

  return (
    <span className={`status-badge status-badge--${variant}`}>{status}</span>
  );
}
