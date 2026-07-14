import { EmptyState } from '@/components/ui';

export default function AdminEmptyState({ icon, title, description }) {
  return (
    <EmptyState
      iconNode={icon}
      title={title}
      description={description}
    />
  );
}
