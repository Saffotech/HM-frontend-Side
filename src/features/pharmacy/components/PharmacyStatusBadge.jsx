import '@/shared/components/common/StatusBadge.css';

const LABELS = {
  pending: 'Pending',
  partially_dispensed: 'Partially Dispensed',
  dispensed: 'Dispensed',
};

export default function PharmacyStatusBadge({ status }) {
  const key = (status || '').toLowerCase();
  const label = LABELS[key] ?? status;
  let variant = 'default';
  if (key === 'pending' || key === 'partially_dispensed') variant = 'warning';
  else if (key === 'dispensed') variant = 'success';

  return <span className={`status-badge status-badge--${variant}`}>{label}</span>;
}
