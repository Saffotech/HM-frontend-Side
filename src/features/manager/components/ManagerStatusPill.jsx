const STATUS_MAP = {
  active: 'success',
  inactive: 'neutral',
  completed: 'success',
  pending: 'warning',
  paid: 'success',
  partial: 'warning',
  unpaid: 'danger',
  cancelled: 'danger',
  canceled: 'danger',
  registered: 'info',
  in_progress: 'info',
  warning: 'warning',
};

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export default function AdminStatusPill({ label, tone }) {
  const key = normalizeKey(label);
  const resolved = tone || STATUS_MAP[key] || 'neutral';
  const display = label
    ? String(label).replace(/_/g, ' ')
    : '—';

  return (
    <span className={`admin-status-pill admin-status-pill--${resolved}`}>
      {display}
    </span>
  );
}
