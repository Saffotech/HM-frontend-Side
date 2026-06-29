import './StatusPill.css';

const MAP = {
  Waiting: 'doc-pill--waiting',
  Priority: 'doc-pill--priority',
  'In Progress': 'doc-pill--progress',
  Completed: 'doc-pill--done',
  Emergency: 'doc-pill--emergency',
  New: 'doc-pill--new',
  'Follow-up': 'doc-pill--muted',
  Active: 'doc-pill--new',
  Ordered: 'doc-pill--progress',
  'Sample Collected': 'doc-pill--sample',
  Pending: 'doc-pill--waiting',
  pending: 'doc-pill--waiting',
  Processing: 'doc-pill--progress',
  Reviewed: 'doc-pill--reviewed',
  Cancelled: 'doc-pill--muted',
  cancelled: 'doc-pill--muted',
  dispensed: 'doc-pill--done',
  partially_dispensed: 'doc-pill--progress',
  scheduled: 'doc-pill--muted',
  waiting: 'doc-pill--waiting',
  in_progress: 'doc-pill--progress',
  completed: 'doc-pill--done',
};

const LABELS = {
  partially_dispensed: 'Partially dispensed',
  in_progress: 'In progress',
  pending: 'Pending',
  dispensed: 'Dispensed',
  cancelled: 'Cancelled',
  scheduled: 'Scheduled',
  waiting: 'Waiting',
  completed: 'Completed',
};

function formatStatusLabel(status) {
  if (!status) return '—';
  if (LABELS[status]) return LABELS[status];
  if (MAP[status]) return status;
  return String(status)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function StatusPill({ status }) {
  const cls = MAP[status] || 'doc-pill--muted';
  return <span className={`doc-pill ${cls}`}>{formatStatusLabel(status)}</span>;
}
