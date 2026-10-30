import { EmptyState } from '@/components/ui';

/* Legacy identifier preserved: AdminEmptyState. Active name: ManagerEmptyState. */
export default function ManagerEmptyState({ icon, title, description }) {
  return (
    <EmptyState
      iconNode={icon}
      title={title}
      description={description}
    />
  );
}
