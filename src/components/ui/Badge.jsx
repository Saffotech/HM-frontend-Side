import '@/shared/components/common/StatusBadge.css';

const VARIANT_ALIASES = {
  scheduled: 'scheduled',
  pending: 'pending',
  waiting: 'pending',
  completed: 'completed',
  paid: 'completed',
  dispensed: 'completed',
  available: 'completed',
  cancelled: 'cancelled',
  unpaid: 'cancelled',
  failed: 'cancelled',
  partial: 'warning',
  active: 'active',
  occupied: 'info',
  inactive: 'inactive',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  default: 'default',
  called: 'info',
  in_progress: 'warning',
  partially_dispensed: 'warning',
};

const STATUS_LABELS = {
  scheduled: 'Scheduled',
  pending: 'Pending',
  waiting: 'Waiting',
  completed: 'Completed',
  paid: 'Paid',
  unpaid: 'Unpaid',
  partial: 'Partial',
  cancelled: 'Cancelled',
  active: 'Active',
  inactive: 'Inactive',
  occupied: 'Occupied',
  available: 'Available',
  called: 'Called',
  in_progress: 'In Progress',
  dispensed: 'Dispensed',
  partially_dispensed: 'Partially Dispensed',
};

/**
 * Unified Badge — status or explicit variant.
 * Prefer: <Badge status="scheduled" /> or <Badge variant="pending">Pending</Badge>
 */
export default function Badge({
  status,
  variant,
  children,
  className = '',
  label,
}) {
  const key = String(status || variant || '').toLowerCase().replace(/\s+/g, '_');
  const resolvedVariant = VARIANT_ALIASES[key] || VARIANT_ALIASES[variant] || 'default';
  const text =
    children ??
    label ??
    STATUS_LABELS[key] ??
    status ??
    variant ??
    '';

  return (
    <span className={`status-badge status-badge--${resolvedVariant} ${className}`.trim()}>
      {text}
    </span>
  );
}
