const STATUS_MAP = {
  active: 'success',
  inactive: 'neutral',
  completed: 'success',
  complete: 'success',
  pending: 'warning',
  paid: 'success',
  partial: 'warning',
  unpaid: 'danger',
  cancelled: 'danger',
  canceled: 'danger',
  no_show: 'danger',
  missed: 'danger',
  missed_appointment: 'danger',
  registered: 'info',
  admit: 'info',
  discharged: 'warning',
  in_progress: 'info',
  warning: 'warning',
};

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

/* Legacy identifier preserved: AdminStatusPill. Active name: ManagerStatusPill. */
export default function ManagerStatusPill({ label, tone }) {
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
