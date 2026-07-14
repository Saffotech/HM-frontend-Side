import { Badge } from '@/components/ui';

/** @deprecated Prefer `import { Badge } from '@/components/ui'` */
export default function StatusBadge({ status, className = '' }) {
  return <Badge status={status} className={className} />;
}
