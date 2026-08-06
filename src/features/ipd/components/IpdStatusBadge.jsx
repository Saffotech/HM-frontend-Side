import { cn } from '@/features/ipd/utils/cn';
import { IPD_ADMISSION_STATUS_LABELS } from '@/features/ipd/utils/constants';

const VARIANT_CLASS = {
  admitted: 'ipd-badge--admitted',
  discharged: 'ipd-badge--discharged',
  available: 'ipd-badge--available',
  occupied: 'ipd-badge--occupied',
  pending: 'ipd-badge--occupied',
  partial: 'ipd-badge--occupied',
  paid: 'ipd-badge--available',
};

export default function IpdStatusBadge({ status, label }) {
  const key = String(status || '').toLowerCase();
  const text =
    label ||
    IPD_ADMISSION_STATUS_LABELS[key] ||
    (key ? key.charAt(0).toUpperCase() + key.slice(1) : '—');

  return (
    <span className={cn('ipd-badge', VARIANT_CLASS[key])}>{text}</span>
  );
}
