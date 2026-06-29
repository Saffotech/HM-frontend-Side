const STATUS_MAP = {
  waiting: { label: 'Waiting', className: 'nurse-badge--waiting' },
  vitals_completed: { label: 'Vitals Completed', className: 'nurse-badge--vitals' },
  in_consultation: { label: 'In Consultation', className: 'nurse-badge--consult' },
  completed: { label: 'Completed', className: 'nurse-badge--completed' },
  cancelled: { label: 'Cancelled', className: 'nurse-badge--draft' },
  in_progress: { label: 'In Consultation', className: 'nurse-badge--consult' },
  draft: { label: 'Draft', className: 'nurse-badge--draft' },
  submitted: { label: 'Submitted', className: 'nurse-badge--submitted' },
  given: { label: 'Given', className: 'nurse-badge--given' },
  missed: { label: 'Missed', className: 'nurse-badge--missed' },
  delayed: { label: 'Delayed', className: 'nurse-badge--delayed' },
  refused: { label: 'Refused', className: 'nurse-badge--refused' },
  active: { label: 'Active', className: 'nurse-badge--completed' },
  resolved: { label: 'Resolved', className: 'nurse-badge--submitted' },
  pending: { label: 'Pending', className: 'nurse-badge--waiting' },
  admitted: { label: 'Admitted', className: 'nurse-badge--completed' },
};

function formatStatusLabel(status) {
  if (!status) return 'Unknown';
  return String(status)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function NurseQueueStatusBadge({ status }) {
  const s = status?.toLowerCase();
  const meta = STATUS_MAP[s] || {
    label: formatStatusLabel(status),
    className: 'nurse-badge--draft',
  };
  return <span className={`nurse-badge ${meta.className}`}>{meta.label}</span>;
}
